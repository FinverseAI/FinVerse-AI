"use client";

import { useCallback, useEffect, useState } from "react";

export class ActivityApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function activityRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
    signal: options?.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ActivityApiError(
      "The server returned an invalid response. Please try again.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ActivityApiError(
      typeof data?.message === "string"
        ? data.message
        : "Unable to update your activity. Please try again.",
      response.status,
    );
  return data as T;
}

export function activityError(error: unknown) {
  return error instanceof Error &&
    error.name !== "TimeoutError" &&
    error.name !== "TypeError"
    ? error.message
    : "Unable to reach your account. Please try again.";
}

export function useActivity<T extends { id: string }>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    activityRequest<T[]>(path, { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data))
          throw new Error(
            "The server returned an invalid activity list. Please try again.",
          );
        if (active) {
          setItems(data);
          setError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setError(activityError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, revision]);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }, []);
  async function add(input: Omit<T, "id">) {
    const saved = await activityRequest<T>(path, {
      method: "POST",
      body: JSON.stringify(input),
    });
    setItems((current) => [saved, ...current]);
  }
  async function update(id: string, input: Omit<T, "id">) {
    const saved = await activityRequest<T>(
      `${path}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
    setItems((current) =>
      current.map((item) => (item.id === id ? saved : item)),
    );
  }
  function patch(id: string, updater: (item: T) => T) {
    setItems((current) =>
      current.map((item) => (item.id === id ? updater(item) : item)),
    );
  }
  async function remove(id: string) {
    try {
      await activityRequest(`${path}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (error) {
      // A bill removed in another tab is already in the desired state.
      if (!(error instanceof ActivityApiError) || error.status !== 404)
        throw error;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }
  return { items, loading, error, retry, add, update, patch, remove };
}
