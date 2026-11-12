/**
 * SiteHeader —— 网站头部业务区块（与 `site-header.meta.ts` 一一对应）。
 *
 * 内部模块 BrandLogo / Navbar / NavItem / DropdownMenu / HeaderActions / MobileMenu
 * 都只是本文件的私有组件，**不是**独立物料：用户拖拽、配置的只有 SiteHeader 本身，
 * 所有内容由 props 驱动。
 *
 * 响应式用「根元素自身宽度」而不是 `window.matchMedia`：编辑器画布和预览都可能
 * 在 iframe / 窄容器里，viewport 宽度和区块实际可用宽度并不一致。
 */
import * as React from "react";

import { cx, passthrough } from "./block-kit";
import {
  type HeaderAction,
  type NavItem,
  type NavLink,
  type SiteHeaderConfig,
  isItemActive,
  isLinkActive,
  readSiteHeaderConfig,
} from "./site-header.model";

type Props = Record<string, unknown>;

function linkAttrs(link: { target: string }) {
  const blank = link.target === "_blank";
  return {
    target: blank ? "_blank" : undefined,
    rel: blank ? "noopener noreferrer" : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* BrandLogo                                                           */
/* ------------------------------------------------------------------ */

function BrandLogo({ config }: { config: SiteHeaderConfig }) {
  const hasImage = Boolean(config.logoSrc);
  // 图片为空时自动退回文字标识；文字也被关掉就保底显示品牌名，避免空链接。
  const showText = !hasImage || config.showBrandText;
  return (
    <a className="lc-sh-brand" href={config.brandHref} aria-label={config.brandText || "首页"}>
      {hasImage ? (
        <img
          className="lc-sh-brand-img"
          src={config.logoSrc}
          alt={config.logoAlt}
          style={{ width: config.logoWidth }}
        />
      ) : null}
      {showText ? <span className="lc-sh-brand-text">{config.brandText}</span> : null}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar / NavItem / DropdownMenu（桌面）                              */
/* ------------------------------------------------------------------ */

function DropdownMenu({
  id,
  links,
  activePath,
  onNavigate,
}: {
  id: string;
  links: NavLink[];
  activePath: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="lc-sh-dropdown" id={id}>
      {links.map((link) => (
        <li key={link.id}>
          <a
            className={cx("lc-sh-dropdown-link", isLinkActive(link, activePath) && "is-active")}
            aria-current={isLinkActive(link, activePath) ? "page" : undefined}
            onClick={onNavigate}
            href={link.href || undefined}
            {...linkAttrs(link)}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function DesktopNavItem({
  item,
  activePath,
  open,
  onOpenChange,
}: {
  item: NavItem;
  activePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const active = isItemActive(item, activePath);
  const menuId = `lc-sh-menu-${item.id}`;
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  if (item.children.length === 0) {
    return (
      <li className="lc-sh-item">
        <a
          className={cx("lc-sh-link", active && "is-active")}
          aria-current={active ? "page" : undefined}
          href={item.href || undefined}
          {...linkAttrs(item)}
        >
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li
      className="lc-sh-item"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onOpenChange(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cx("lc-sh-link", "lc-sh-trigger", active && "is-active")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
      >
        {item.label}
        <span className="lc-sh-caret" aria-hidden="true" />
      </button>
      {open ? (
        <DropdownMenu
          id={menuId}
          links={item.children}
          activePath={activePath}
          onNavigate={() => onOpenChange(false)}
        />
      ) : null}
    </li>
  );
}

function Navbar({ config }: { config: SiteHeaderConfig }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const navRef = React.useRef<HTMLElement | null>(null);

  // 点到导航之外收起下拉；监听挂在节点所属 document 上（编辑器画布是 iframe）。
  React.useEffect(() => {
    if (!openId) return;
    const doc = navRef.current?.ownerDocument;
    if (!doc) return;
    const onPointerDown = (event: Event) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    doc.addEventListener("pointerdown", onPointerDown);
    return () => doc.removeEventListener("pointerdown", onPointerDown);
  }, [openId]);

  if (config.navItems.length === 0) return null;
  return (
    <nav className="lc-sh-nav" aria-label="主导航" ref={navRef}>
      <ul className="lc-sh-list">
        {config.navItems.map((item) => (
          <DesktopNavItem
            key={item.id}
            item={item}
            activePath={config.activePath}
            open={openId === item.id}
            onOpenChange={(next) => setOpenId(next ? item.id : null)}
          />
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* HeaderActions                                                       */
/* ------------------------------------------------------------------ */

function HeaderActions({
  actions,
  onNavigate,
  stacked,
}: {
  actions: HeaderAction[];
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  if (actions.length === 0) return null;
  return (
    <div className={cx("lc-sh-actions", stacked && "is-stacked")}>
      {actions.map((action) => (
        <a
          key={action.id}
          className={cx("lc-sh-btn", `lc-sh-btn--${action.variant}`)}
          onClick={onNavigate}
          href={action.href || undefined}
          {...linkAttrs(action)}
        >
          {action.label}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MobileMenu                                                          */
/* ------------------------------------------------------------------ */

function MobileMenu({
  id,
  config,
  onClose,
}: {
  id: string;
  config: SiteHeaderConfig;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  return (
    <nav className="lc-sh-mobile" id={id} aria-label="移动端导航">
      <ul className="lc-sh-mobile-list">
        {config.navItems.map((item) => {
          const active = isItemActive(item, config.activePath);
          if (item.children.length === 0) {
            return (
              <li key={item.id}>
                <a
                  className={cx("lc-sh-mobile-link", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  href={item.href || undefined}
                  {...linkAttrs(item)}
                >
                  {item.label}
                </a>
              </li>
            );
          }
          const isOpen = expanded === item.id;
          const subId = `${id}-${item.id}`;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cx("lc-sh-mobile-link", "lc-sh-trigger", active && "is-active")}
                aria-expanded={isOpen}
                aria-controls={subId}
                onClick={() => setExpanded(isOpen ? null : item.id)}
              >
                {item.label}
                <span className={cx("lc-sh-caret", isOpen && "is-open")} aria-hidden="true" />
              </button>
              {isOpen ? (
                <ul className="lc-sh-mobile-sub" id={subId}>
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <a
                        className={cx(
                          "lc-sh-mobile-link",
                          isLinkActive(child, config.activePath) && "is-active",
                        )}
                        onClick={onClose}
                        href={child.href || undefined}
                        {...linkAttrs(child)}
                      >
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <HeaderActions actions={config.actions} onNavigate={onClose} stacked />
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* SiteHeader                                                          */
/* ------------------------------------------------------------------ */

/** 观察根元素宽度；SSR / 首帧按桌面渲染，挂载后再判定，避免水合不一致。 */
function useBelowWidth(
  ref: React.RefObject<HTMLElement | null>,
  breakpoint: number,
  enabled: boolean,
) {
  const [below, setBelow] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === "undefined") {
      setBelow(false);
      return;
    }
    const measure = () => setBelow(element.getBoundingClientRect().width < breakpoint);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, breakpoint, enabled]);
  return below;
}

export function SiteHeader(props: Props) {
  const config = readSiteHeaderConfig(props);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const toggleRef = React.useRef<HTMLButtonElement | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const uid = React.useId();
  const mobileId = `lc-sh-mobile-${uid.replace(/:/g, "")}`;

  const isMobile = useBelowWidth(rootRef, config.mobileBreakpoint, config.mobileMenu);

  // 切回桌面宽度时收起面板，避免下次变窄时直接带着展开态。
  React.useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  const style = {
    "--lc-sh-height": `${config.height}px`,
    "--lc-sh-max": `${config.maxWidth}px`,
  } as React.CSSProperties;

  const brand = <BrandLogo config={config} />;
  const nav = isMobile ? null : <Navbar config={config} />;
  const actions = isMobile ? null : <HeaderActions actions={config.actions} />;
  const hamburger = isMobile ? (
    <button
      ref={toggleRef}
      type="button"
      className="lc-sh-burger"
      aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
      aria-expanded={mobileOpen}
      aria-controls={mobileId}
      onClick={() => setMobileOpen((open) => !open)}
    >
      <span className="lc-sh-burger-bars" aria-hidden="true" />
    </button>
  ) : null;

  return (
    <header
      ref={rootRef}
      {...passthrough(props)}
      className={cx(
        "lc-sh",
        `lc-sh--${config.layout}`,
        `lc-sh--${config.appearance}`,
        config.showBorder && "has-border",
        config.sticky && "is-sticky",
        config.overlay && "is-overlay",
        isMobile && "is-mobile",
      )}
      style={{ ...style, ...(props.style as React.CSSProperties | undefined) }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div className="lc-sh-inner">
        {config.layout === "centered" && !isMobile ? (
          <>
            <div className="lc-sh-side lc-sh-side--start">{nav}</div>
            <div className="lc-sh-center">{brand}</div>
            <div className="lc-sh-side lc-sh-side--end">{actions}</div>
          </>
        ) : (
          <>
            <div className="lc-sh-brand-slot">{brand}</div>
            {config.layout === "standard" && nav ? <div className="lc-sh-middle">{nav}</div> : null}
            <div className="lc-sh-side lc-sh-side--end">
              {config.layout === "minimal" ? nav : null}
              {actions}
              {hamburger}
            </div>
          </>
        )}
      </div>
      {isMobile && mobileOpen ? (
        <MobileMenu id={mobileId} config={config} onClose={closeMobile} />
      ) : null}
    </header>
  );
}
