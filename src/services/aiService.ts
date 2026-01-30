import type { AIMode, UserProfile, Repo } from "../types";

interface AIRequest {
  profile: UserProfile;
  repos: Repo[];
  mode: AIMode;
}

export const aiService = {
  generateFeedback: async ({
    profile,
    repos,
    mode,
  }: AIRequest): Promise<string> => {
    const profileData = {
      name: profile.name,
      bio: profile.bio,
      stats: {
        followers: profile.followers,
        following: profile.following,
        repos: profile.public_repos,
      },
      location: profile.location,
      company: profile.company,
      created_at: profile.created_at,
      recent_repos: repos.map((r) => ({
        name: r.name,
        lang: r.language,
        desc: r.description,
        stars: r.stargazers_count,
      })),
    };

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileData, aiMode: mode }),
    });

    if (!response.ok) throw new Error("SERVER_ERROR");

    const data = await response.json();
    return data.result;
  },
};
