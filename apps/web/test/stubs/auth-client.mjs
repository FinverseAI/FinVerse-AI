// Stub for auth/client. Only the calls the UI actually makes are stubbed
// (signIn.social, signOut); both resolve successfully, as if the user had
// no session and the sign-in had not yet redirected.
export const authClient = {
  signIn: {
    social: async () => ({ data: null, error: null }),
  },
  signOut: async () => ({ data: null, error: null }),
  useSession: () => ({ data: null, isPending: false, error: null }),
};
