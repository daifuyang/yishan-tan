import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, User } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createSession } from "~/features/auth/auth.actions";
import { currentUserQueryKey } from "~/features/auth/auth.queries";
import { createSessionSchema } from "~/features/auth/auth.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BRAND_NAME = "Yishan Tan";
const BRAND_TAGLINE = "AI 友好框架，快速搭建属于你的专属系统。";
const SAFE_REDIRECT_PREFIX = "/";
const SAFE_REDIRECT_BLOCK_PATTERNS = [/^\/login(\/|$)/, /\/\/+/];

const BRAND_FEATURES = ["统一认证", "权限管控", "OpenAPI"] as const;
const FOOTER_LINKS = ["帮助中心", "隐私政策", "服务条款"] as const;

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

type LoginSearch = z.infer<typeof loginSearchSchema>;
type LoginFormValues = z.infer<typeof createSessionSchema>;

export const Route = createFileRoute("/login")({
  validateSearch: (search): LoginSearch => loginSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    const cached = context.queryClient.getQueryData(currentUserQueryKey);
    if (cached && typeof cached === "object" && cached !== null && "id" in cached) {
      throw redirect({ to: "/admin" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);

  const safeRedirect = React.useMemo(() => sanitizeRedirect(redirectTo), [redirectTo]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { account: "", password: "" },
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => createSession({ data: values }),
    onSuccess: async ({ user }) => {
      queryClient.setQueryData(currentUserQueryKey, user);
      await router.invalidate();
      await navigate({ to: safeRedirect });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  const errorMessage = mutation.error instanceof Error ? mutation.error.message : null;
  const isSubmitting = mutation.isPending;

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#075cf5] bg-[url('/login/login-bg.svg')] bg-cover bg-center font-['PingFang_SC','Microsoft_YaHei','Inter',system-ui,sans-serif] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,23,132,0.22)_0%,rgba(0,69,204,0.06)_44%,rgba(0,92,255,0.08)_100%)]"
      />

      <div className="relative z-[2] mx-auto grid min-h-svh w-full max-w-[1600px] grid-rows-[1fr_auto] px-5 py-6 sm:px-10 lg:px-[5vw]">
        <div className="grid min-h-[calc(100svh-76px)] items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-14 xl:gap-16">
          <aside className="mx-auto w-full max-w-[650px] text-center lg:relative lg:-top-[12vh] lg:mx-0 lg:text-left xl:-top-[14vh]">
            <h1 className="text-[48px] font-extrabold leading-none tracking-normal text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.18)] sm:text-[64px] lg:text-[88px]">
              {BRAND_NAME}
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-[21px] font-normal leading-[1.6] tracking-normal text-white/90 drop-shadow-[0_8px_20px_rgba(0,20,90,0.18)] sm:text-[24px] lg:mx-0 lg:text-[26px]">
              {BRAND_TAGLINE}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[17px] font-medium text-white sm:text-[18px] lg:justify-start">
              {BRAND_FEATURES.map((item) => (
                <span
                  key={item}
                  className="inline-flex h-[40px] min-w-[112px] items-center justify-center rounded-full border border-white/42 bg-white/[0.08] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-[2px]"
                >
                  {item}
                </span>
              ))}
            </div>
          </aside>

          <section className="mx-auto flex w-full max-w-[520px] flex-col lg:mx-0 lg:justify-self-end">
            <div className="min-h-[560px] rounded-[24px] border border-white/70 bg-white/[0.96] px-7 py-10 text-[#101828] shadow-[0_32px_80px_rgba(0,22,90,0.28),inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-11 sm:py-12 lg:px-[46px]">
              <div className="mb-9 text-center">
                <h2 className="text-[36px] font-bold leading-tight tracking-normal text-[#17274B]">
                  登录工作台
                </h2>
                <p className="mt-3 text-[18px] text-[#66758C]">使用工作邮箱登录后台系统</p>
              </div>

              <form className="space-y-6" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-[#8F9BB2]"
                      aria-hidden
                    />
                    <Input
                      id="login-account"
                      type="text"
                      autoComplete="username"
                      placeholder="邮箱 / 手机号"
                      aria-label="邮箱或手机号"
                      aria-invalid={form.formState.errors.account ? true : undefined}
                      disabled={isSubmitting}
                      className="h-[62px] rounded-[9px] border-[#D4DBE8] bg-white pl-[64px] text-[18px] text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.02)] placeholder:text-[#9AA6BB] focus-visible:border-[#1677FF] focus-visible:ring-[#1677FF]/12 aria-invalid:border-[#FDA29B] aria-invalid:ring-[#F04438]/8"
                      {...form.register("account")}
                    />
                  </div>
                  <FieldError message={form.formState.errors.account?.message} />
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-[#8F9BB2]"
                      aria-hidden
                    />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="密码"
                      aria-label="密码"
                      aria-invalid={form.formState.errors.password ? true : undefined}
                      disabled={isSubmitting}
                      className="h-[62px] rounded-[9px] border-[#D4DBE8] bg-white pl-[64px] pr-14 text-[18px] text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.02)] placeholder:text-[#9AA6BB] focus-visible:border-[#1677FF] focus-visible:ring-[#1677FF]/12 aria-invalid:border-[#FDA29B] aria-invalid:ring-[#F04438]/8"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#667085] hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176BFF] focus-visible:ring-offset-2"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                  <FieldError message={form.formState.errors.password?.message} />
                </div>

                <div className="flex items-center justify-between text-[16px]">
                  <label className="inline-flex cursor-pointer items-center gap-3 text-[#344054]">
                    <input
                      type="checkbox"
                      className="size-[22px] rounded-[4px] border-[#CBD5E1] text-[#176BFF] focus:ring-[#176BFF]"
                      disabled={isSubmitting}
                    />
                    <span>记住我</span>
                  </label>
                  <button
                    type="button"
                    className="font-semibold text-[#075EFF] hover:text-[#004AD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176BFF] focus-visible:ring-offset-2"
                  >
                    忘记密码？
                  </button>
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 h-[62px] w-full rounded-[9px] bg-[#075EFF] text-[20px] font-semibold text-white shadow-[0_10px_22px_rgba(7,94,255,0.20)] hover:bg-[#0052E6]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>登录中…</span>
                    </>
                  ) : (
                    <span>登录</span>
                  )}
                </Button>
              </form>

              <div className="mt-9 flex items-center gap-7 text-[16px] text-[#98A2B3]">
                <span className="block flex-1 border-[#DDE4EE] border-t" />
                <span>或</span>
                <span className="block flex-1 border-[#DDE4EE] border-t" />
              </div>

              <div className="mt-6 text-center text-[16px] text-[#344054]">
                <span>还没有账号？</span>
                <button
                  type="button"
                  className="ml-3 font-semibold text-[#075EFF] hover:text-[#004AD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176BFF] focus-visible:ring-offset-2"
                >
                  立即注册
                </button>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-2 text-[16px] text-white/78 lg:justify-start">
          <span>© 2026 {BRAND_NAME}. All rights reserved.</span>
          <span aria-hidden className="text-white/40">
            |
          </span>
          {FOOTER_LINKS.map((item, index) => (
            <React.Fragment key={item}>
              <button
                type="button"
                className="inline-flex items-center text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
              >
                <span>{item}</span>
              </button>
              {index < FOOTER_LINKS.length - 1 ? (
                <span aria-hidden className="text-white/40">
                  |
                </span>
              ) : null}
            </React.Fragment>
          ))}
        </footer>
      </div>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function sanitizeRedirect(input: string | undefined): "/admin" {
  const fallback = "/admin" as const;
  if (!input) return fallback;
  if (!input.startsWith(SAFE_REDIRECT_PREFIX)) return fallback;
  if (SAFE_REDIRECT_BLOCK_PATTERNS.some((re) => re.test(input))) return fallback;
  return input as "/admin";
}
