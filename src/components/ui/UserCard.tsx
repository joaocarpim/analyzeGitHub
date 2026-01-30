import type { GitHubUser } from "../../types";
interface UserCardProps {
  user: GitHubUser;
}
export const UserCard = ({ user }: UserCardProps) => (
  <a
    href={user.html_url}
    target="_blank"
    rel="noopener noreferrer"
    className="user-card"
  >
    <img src={user.avatar_url} alt={user.login} className="user-avatar" />
    <div>
      <div className="user-name">{user.login}</div>
      <div className="user-login">@{user.login}</div>
    </div>
  </a>
);
