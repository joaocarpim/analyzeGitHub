import { useQuery } from "@tanstack/react-query";
import { githubService } from "../services/githubService";

export const useGithubProfile = (username: string) => {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => githubService.getProfile(username),
    enabled: !!username,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useGithubConnections = (username: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["relationships", username],
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        githubService.getAllUsers(
          `https://api.github.com/users/${username}/followers`,
        ),
        githubService.getAllUsers(
          `https://api.github.com/users/${username}/following`,
        ),
      ]);
      return { followers, following };
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};

export const useGithubRepos = (username: string) => {
  return useQuery({
    queryKey: ["repos", username],
    queryFn: () => githubService.getRepos(username),
    enabled: !!username,
    refetchOnWindowFocus: false,
  });
};
