"use server";

import { db } from "@/firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import { getUserDocFromFirestore, handleCookies } from "./auth";
import { LikedPost, Post, User, Comment } from "@/types";
import { formatDate } from "@/utils/helpers";
import { createNewNotification } from "./notifications";

export const createNewPost = async (post: string): Promise<string> => {
  try {
    if (post.length < 1) {
      return "Input cannot be empty";
    }

    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string") return "UserId Not Found";

    const userDoc = await getUserDocFromFirestore(userId);
    if (userDoc === false) return "User Not Found";

    const user = userDoc as User;
    const userInterest = user.interests[0];
    const postId = generatePostId(post);

    const newPost = {
      userId: userId,
      postId: postId,
      category: userInterest.toLowerCase(),
      post: post,
      postImage: "",
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    };
    await setDoc(doc(db, "posts", postId), newPost);

    return "Post Created Successfully";
  } catch (error) {
    throw new Error();
  }
};

export const fetchFeedPosts = async (mode: string | null): Promise<Post[]> => {
  try {
    let q: any;

    if (mode === "for-you" || mode === null) {
      q = query(collection(db, "posts"));
    } else if (mode === "following") {
      const followingIds = await getUserFollowingIds();
      q = query(collection(db, "posts"), where("userId", "in", followingIds));
    } else {
      q = query(collection(db, "posts"));
    }

    const posts: Post[] = [];

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const post = doc.data() as Post;
      posts.push(post);
    });

    if ((mode === "for-you" || mode === null) && posts.length === 0) {
      const allPostsQuery = query(collection(db, "posts"));
      const allPostsSnapshot = await getDocs(allPostsQuery);
      allPostsSnapshot.forEach((doc) => {
        const post = doc.data() as Post;
        posts.push(post);
      });
    }

    const promises = posts.map(async (post) => {
      const user = (await getUserDocFromFirestore(post.userId)) as User;
      const likeCount = await fetchAllLikesForPost(post.postId);
      const totalLikes = likeCount.length;
      const totalComment = await fetchNumberOfComment(post.postId);
      const likedPosts = await findAllLikedPost();
      let hasLikePost: boolean = false;
      likedPosts.forEach((favPost) => {
        if (favPost.postId === post.postId) {
          hasLikePost = true;
        }
      });

      return {
        postId: post.postId,
        userId: post.userId,
        post: post.post,
        postImage: post.postImage,
        category: post.category,
        createdAt: post.createdAt,
        createdAtString: formatDate(post.createdAt),
        updatedAtString: formatDate(post.updatedAt),
        updatedAt: post.updatedAt,
        hasLikePost: hasLikePost,
        totalLikes: totalLikes,
        totalComment: totalComment,
        user: {
          username: user.username,
          fullName: user.fullName,
          profilePic: user.profilePic,
          country: user.country,
        },
      };
    });

    const allPosts = (await Promise.all(promises)) as Post[];
    return allPosts;
  } catch (error: any) {
    throw new Error(error);
  }
};

export const verifyPostExists = async (postId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return false;
    return true;
  } catch (error) {
    return false;
  }
};

export const fetchPostById = async (postId: string): Promise<Post> => {
  try {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);

    const postDetail = docSnap.data() as Post;

    const user = (await getUserDocFromFirestore(postDetail.userId)) as User;
    const likeCount = await fetchAllLikesForPost(postId);
    const totalLikes = likeCount.length;
    const totalComment = await fetchNumberOfComment(postId);
    const likedPosts = await findAllLikedPost();
    let hasLikePost: boolean = false;
    likedPosts.forEach((favPost) => {
      if (favPost.postId === postId) {
        hasLikePost = true;
      }
    });

    const post: Post = {
      postId: postId,
      userId: postDetail.userId,
      post: postDetail.post,
      postImage: postDetail.postImage,
      category: postDetail.category,
      createdAt: postDetail.createdAt,
      updatedAt: postDetail.updatedAt,
      createdAtString: formatDate(postDetail.createdAt),
      updatedAtString: formatDate(postDetail.updatedAt),
      totalLikes: totalLikes,
      hasLikePost: hasLikePost,
      totalComment: totalComment,
      user: {
        username: user.username,
        fullName: user.fullName,
        profilePic: user.profilePic,
        country: user.country,
      },
    };
    return post;
  } catch (error: any) {
    throw new Error(error);
  }
};

export const generatePostId = (post: string): string => {
  const currentDate = new Date();

  const day = currentDate.getDate().toString().padStart(2, "0");
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const year = currentDate.getFullYear().toString();
  const hours = currentDate.getHours().toString().padStart(2, "0");
  const minutes = currentDate.getMinutes().toString().padStart(2, "0");
  const seconds = currentDate.getSeconds().toString().padStart(2, "0");

  const postIdBase = `${year}${month}${day}${hours}${minutes}${seconds}${post}`;

  const postId = postIdBase.substring(0, 15);

  return postId;
};

export const generateLikeId = (userId: string): string => {
  const currentDate = new Date();

  const day = currentDate.getDate().toString().padStart(2, "0");
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const year = currentDate.getFullYear().toString().substring(2); // Taking only last two digits of the year
  const hours = currentDate.getHours().toString().padStart(2, "0");
  const minutes = currentDate.getMinutes().toString().padStart(2, "0");
  const seconds = currentDate.getSeconds().toString().padStart(2, "0");

  const manipulatedUserId = userId.split("").reverse().join("");

  const likeIdBase = `${year}${month}${day}${hours}${minutes}${seconds}${manipulatedUserId}`;

  const likeId = likeIdBase.substring(0, 11);

  return likeId;
};

export const handleLikePost = async (
  postId: string,
  postUserId: string
): Promise<string> => {
  try {
    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string") return "User Id Not Found";
    const likeId = generateLikeId(userId);

    const userData = (await getUserDocFromFirestore(userId)) as DocumentData;

    const documentId = `${userId}${postId}`;
    const q = query(
      collection(db, "likes"),
      where("postId", "==", postId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      await deleteDoc(doc(db, "likes", documentId));

      await createNewNotification(
        `${userData.fullName} removed your post from favourite`,
        postUserId
      );
      return "You've Removed This Post From Your Favorites";
    }

    const newLikeDocument = {
      likeId: likeId,
      userId: userId,
      postId: postId,
      likeCreatedAt: new Date().getTime(),
    };

    await setDoc(doc(db, "likes", documentId), newLikeDocument);

    await createNewNotification(
      `${userData.fullName} added your post to favourite`,
      postUserId
    );

    return "Post Favourited Successfully";
  } catch (error) {
    throw new Error();
  }
};

export const findAllLikedPost = async (): Promise<LikedPost[]> => {
  try {
    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string") {
      throw new Error("User id not found or invalid.");
    }

    const allLikedPost: LikedPost[] = [];

    const q = query(collection(db, "likes"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return allLikedPost;
    }

    querySnapshot.forEach((doc) => {
      const likedPost = doc.data() as LikedPost;
      allLikedPost.push(likedPost);
    });

    return allLikedPost;
  } catch (error) {
    throw new Error("Failed to fetch liked posts.");
  }
};

export const fetchNumberOfComment = async (postId: string): Promise<number> => {
  try {
    const q = query(collection(db, "comments"), where("postId", "==", postId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    throw new Error("Failed to fetch number of comments.");
  }
};

export const fetchAllLikesForPost = async (
  postId: string
): Promise<LikedPost[]> => {
  try {
    if (!postId) throw new Error("Post ID is required");
    const totalLikes: LikedPost[] = [];

    const q = query(collection(db, "likes"), where("postId", "==", postId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return totalLikes;
    }

    querySnapshot.forEach((doc) => {
      const likesCount = doc.data() as LikedPost;
      totalLikes.push(likesCount);
    });

    return totalLikes;
  } catch (error) {
    throw new Error("Failed to fetch liked posts.");
  }
};

export const editPost = async (
  postId: string,
  post: string
): Promise<boolean> => {
  try {
    const postRef = doc(db, "posts", postId);

    await updateDoc(postRef, {
      post: post,
      updatedAt: new Date().getTime(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

export const deletePost = async (
  postId: string,
  type: string
): Promise<boolean> => {
  try {
    let collection: string;
    if (type === "post") {
      collection = "posts";
    } else {
      collection = "comments";
    }
    await deleteDoc(doc(db, collection, postId));
    return true;
  } catch (error) {
    return false;
  }
};

export const createNewComment = async (
  postId: string,
  commentText: string,
  postUserId: string
) => {
  try {
    if (!postId || !commentText) return false;

    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string") return false;

    const userData = (await getUserDocFromFirestore(userId)) as DocumentData;

    const commentId = generatePostId(commentText);

    const newComment = {
      commentId: commentId,
      userId: userId,
      postId: postId,
      commentText: commentText,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    };

    await setDoc(doc(db, "comments", commentId), newComment);

    await createNewNotification(
      `${userData.fullName} added a comment to your post`,
      postUserId
    );

    return true;
  } catch (error) {
    return false;
  }
};

export const fetchPostComments = async (postId: string): Promise<Comment[]> => {
  try {
    const q = query(collection(db, "comments"));

    const querySnapshot = await getDocs(q);

    const promises = querySnapshot.docs
      .filter((doc) => doc.data().postId === postId)
      .map(async (doc) => {
        const comment = doc.data() as Comment;
        const user = (await getUserDocFromFirestore(comment.userId)) as User;

        return {
          commentId: comment.commentId,
          userId: comment.userId,
          postId: comment.postId,
          commentText: comment.commentText,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          createdAtString: formatDate(comment.createdAt),
          updatedAtString: formatDate(comment.updatedAt),
          user: {
            fullName: user.fullName,
            profilePic: user.profilePic,
            country: user.country,
          },
        };
      });

    const allComments = (await Promise.all(promises)) as Comment[];

    return allComments;
  } catch (error: any) {
    throw new Error(error);
  }
};

export const editComment = async (
  commentId: string,
  comment: string
): Promise<boolean> => {
  try {
    const commentRef = doc(db, "comments", commentId);

    await updateDoc(commentRef, {
      commentText: comment,
      updatedAt: new Date().getTime(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

export const getUserCategory = async (): Promise<string> => {
  try {
    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string")
      throw new Error("Refresh the page");

    const user = await getUserDocFromFirestore(userId);

    if (typeof user === "boolean") {
      throw new Error("Refresh the page");
    }

    const userCategory = user.interests[0] as string;

    return userCategory;
  } catch (error: any) {
    throw new Error(error);
  }
};

export const getUserFollowingIds = async (): Promise<string[]> => {
  try {
    const userId = await handleCookies("get", "USER_ID");
    if (!userId || typeof userId !== "string")
      throw new Error("Refresh the page");

    const q = query(
      collection(db, "follows"),
      where("followerUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return [""];
    }

    const followingIds: string[] = [];

    querySnapshot.docs.map((doc) => {
      const data = doc.data();

      followingIds.push(data.followingUserId);
    });

    return followingIds;
  } catch (error: any) {
    throw new Error(error);
  }
};
