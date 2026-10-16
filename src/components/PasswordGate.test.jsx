import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
vi.mock("../data/http/config", () => ({ isHttpMode: true, apiBaseUrl: "https://public.test/monp-api/api/v1" }));
vi.mock("../data/cache/textCache", () => ({ clearTextCaches: vi.fn().mockResolvedValue() }));
import PasswordGate from "./PasswordGate";
import { setPasswordSession } from "../data/http/passwordSession";
afterEach(() => { setPasswordSession(null); vi.unstubAllGlobals(); });
it("does not mount private screens until the server accepts the password", async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ token: "accepted-session", expiresAt: new Date(Date.now() + 60000).toISOString() })));
  vi.stubGlobal("fetch", fetchImpl);
  render(<PasswordGate queryClient={new QueryClient()}><p>private work screen</p></PasswordGate>);
  expect(screen.queryByText("private work screen")).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("비밀번호"), "wrong");
  await user.click(screen.getByRole("button", { name: "접속", exact: true }));
  expect(await screen.findByRole("alert")).toHaveTextContent("비밀번호가 일치하지 않습니다");
  expect(screen.queryByText("private work screen")).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText("비밀번호"));
  await user.type(screen.getByLabelText("비밀번호"), "test-access");
  await user.click(screen.getByRole("button", { name: "접속", exact: true }));
  expect(await screen.findByText("private work screen")).toBeInTheDocument();
  expect(fetchImpl.mock.calls[0][0]).toBe("https://public.test/monp-api/api/v1/auth/login");
});
