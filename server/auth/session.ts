export type SessionUser = {
  id: string;
  githubId: number;
  username: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  return null;
}
