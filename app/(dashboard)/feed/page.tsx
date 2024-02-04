import React from "react";
import FeedToggle from "@/components/Feed/FeedToggle";
import Feed from "@/components/Feed/Feed";
import CreatePost from "@/components/Feed/CreatePost";
import Container from "@/components/Container";

const FeedPage = () => {
  return (
    <Container>
      <FeedToggle />
      <CreatePost />
      <Feed />
    </Container>
  );
};

export default FeedPage;
