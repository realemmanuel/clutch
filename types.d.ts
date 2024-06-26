export interface User {
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePic: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  interests: string[];
  status?: boolean;
  username: string;
  bio: string;
}

export type Post = {
  postId: string;
  userId: string;
  post: string;
  postImage?: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  createdAtString: string;
  updatedAtString: string;
  totalLikes: number;
  totalComment: number;
  hasLikePost: boolean;
  user: {
    username: string;
    fullName: string;
    profilePic: string;
    country: string;
  };
};

export type Follower = {
  userId: string;
  fullName: string;
  profilePic: string;
  gender: string;
  country: string;
  interests: string[];
};

export type LikedPost = {
  likeId: string;
  userId: string;
  postId: string;
  likeCreatedAt: number;
};

export type Comment = {
  commentId: string;
  userId: string;
  postId: string;
  commentText: string;
  createdAt: number;
  updatedAt: number;
  createdAtString: string;
  updatedAtString: string;
  user: {
    fullName: string;
    profilePic: string;
    country: string;
  };
};

export type Notification = {
  notificationId: string;
  userId: string;
  notificationText: string;
  hasRead: boolean;
  createdAt: number;
};

export type Community = {
  communityId: string;
  createdAt: number;
  creator: string;
  name: string;
  type: string;
  visibility: string;
  description: string;
  members: number;
  communityImage: string;
  active: boolean;
  inviteCode?: string;
};

export type SearchResult = {
  userId?: string;
  username: string;
  profilePic: string;
  fullName: string;
};

export type CommunityPost = Post & {
  communityId: string;
};
