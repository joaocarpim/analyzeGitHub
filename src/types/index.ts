export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface UserProfile extends GitHubUser {
  name: string;
  bio: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  location: string;
  company: string;
  blog: string;
}

export interface Repo {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
}

export type AnalysisTab = "nonFollowers" | "fans" | "mutuals";
export type AIMode = "friendly" | "liar" | "roast";
