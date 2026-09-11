import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  nimiqNetworkConfig: publicProcedure.query(async () => {
    const { ENV } = await import("./env");
    let rpcHost = "unknown";
    try {
      rpcHost = new URL(ENV.nimiqRpcUrl).host;
    } catch {
      rpcHost = ENV.nimiqRpcUrl;
    }
    return {
      networkId: ENV.nimiqNetworkId,
      networkName: ENV.nimiqNetworkName,
      rpcHost,
      explorerUrl: ENV.nimiqExplorerUrl,
      faucetUrl: ENV.nimiqFaucetUrl,
      isTestnet: ENV.isTestnet,
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
