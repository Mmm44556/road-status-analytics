import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "@fontsource/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFoundPage from "@/components/NotFoundPage";
const router = createRouter({ routeTree, defaultNotFoundComponent: NotFoundPage });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 最外層的最後防線：任何地方沒被更細的邊界接住的例外，都在這裡攔下來，
        不然會整頁變空白，而不是只有某個區塊壞掉。 */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
