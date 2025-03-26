import { configureServerSideSIWE } from "connectkit-next-siwe";
import { config } from "@src/utils/wagmi";

const siweServer = configureServerSideSIWE({
  config: {
    chains: config.chains,
    transports: config.transports,
  },
  session: {
    cookieName: "connectkit-next-siwe",
    password: process.env.SESSION_SECRET,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  },
});

export default siweServer.apiRouteHandler;