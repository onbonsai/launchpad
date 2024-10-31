import axios from "axios";

export const sendTweets = async (bids: any) => {
  // Filter the array to get only the objects where platform is 'twitter'
  const twitterObjects = bids.filter((bid: any) => bid.platform && bid.platform === "twitter");

  // Define a function to make the API request
  async function makeApiRequest(bid: any) {
    // Replace this with your actual API request
    const { data } = await axios.post(`/api/twitter/tweet/post`, {
      text: bid.content.text,
      media: bid.content.media,
      address: bid.creator,
      bidId: bid._id,
    });
    return data;
  }

  // Use Promise.all to make the API requests in parallel
  await Promise.all(twitterObjects.map(makeApiRequest));
};
