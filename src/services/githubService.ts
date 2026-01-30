import type { GitHubUser, Repo, UserProfile } from "../types";

const BASE_URL = "https://api.github.com";

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 403) throw new Error("RATE_LIMIT");
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("GENERIC_ERROR");
  }
  return res.json();
};

export const githubService = {
  getProfile: async (username: string): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/users/${username}`);
    return handleResponse(res);
  },

  getRepos: async (username: string): Promise<Repo[]> => {
    const res = await fetch(
      `${BASE_URL}/users/${username}/repos?sort=updated&per_page=10`,
    );
    if (!res.ok) return [];
    return res.json();
  },

  getAllUsers: async (url: string): Promise<GitHubUser[]> => {
    let allData: GitHubUser[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await fetch(`${url}?per_page=${perPage}&page=${page}`);
      const data = await handleResponse(res);
      if (data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < perPage) break;
      page++;
    }
    return allData;
  },
};
