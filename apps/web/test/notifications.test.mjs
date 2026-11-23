import assert from "node:assert/strict";
import test from "node:test";
import { billNotifications } from "../lib/notifications.ts";

const TODAY = "2026-11-23";
function bill(overrides) {
  return {
    id: "bill-1",
    name: "Rent",
    amount: 1850.5,
    dueDate: "2026-11-24",
    ...overrides,
  };
}

test("a bill due tomorrow appears as due-soon", () => {
  const [notification] = billNotifications([bill()], TODAY);
  assert.deepEqual(notification, {
    billId: "bill-1",
    billName: "Rent",
    kind: "due-soon",
    dueDate: "2026-11-24",
    amountDue: 1850.5,
    daysUntilDue: 1,
  });
});

test("a bill due today appears as due-today", () => {
  const [notification] = billNotifications([bill({ dueDate: TODAY })], TODAY);
  assert.equal(notification.kind, "due-today");
  assert.equal(notification.daysUntilDue, 0);
});

test("an overdue bill appears as overdue with a negative day count", () => {
  const [notification] = billNotifications(
    [bill({ dueDate: "2026-11-21" })],
    TODAY,
  );
  assert.equal(notification.kind, "overdue");
  assert.equal(notification.daysUntilDue, -2);
});

test("the due-soon window ends after seven days", () => {
  const inWindow = billNotifications(
    [bill({ id: "in", dueDate: "2026-11-30" })],
    TODAY,
  );
  const outOfWindow = billNotifications(
    [bill({ id: "out", dueDate: "2026-12-01" })],
    TODAY,
  );
  assert.equal(inWindow.length, 1);
  assert.equal(outOfWindow.length, 0);
});

test("fully paid bills never appear, partially paid bills show the remainder", () => {
  const paid = billNotifications([bill({ paidTotal: 1850.5 })], TODAY);
  const partial = billNotifications([bill({ paidTotal: 850.5 })], TODAY);
  assert.equal(paid.length, 0);
  assert.equal(partial[0].amountDue, 1000);
});

test("notifications sort overdue first, then by due date", () => {
  const notifications = billNotifications(
    [
      bill({ id: "soon", name: "Soon", dueDate: "2026-11-26" }),
      bill({ id: "late", name: "Late", dueDate: "2026-11-20" }),
      bill({ id: "today", name: "Today", dueDate: TODAY }),
    ],
    TODAY,
  );
  assert.deepEqual(
    notifications.map((notification) => notification.billId),
    ["late", "today", "soon"],
  );
});

test("an empty bill list yields no notifications", () => {
  assert.deepEqual(billNotifications([], TODAY), []);
});
