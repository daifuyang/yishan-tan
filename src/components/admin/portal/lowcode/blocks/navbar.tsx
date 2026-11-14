/**
 * Navbar —— 导航菜单（行为型基础组件，与 `navbar.meta.ts` 一一对应）。
 *
 * 区块（页头）本身是 Div / Typography / Link 拼出来的；唯独「下拉菜单 + 手机端抽屉」带交互，
 * 纯静态原子表达不了，所以单独做成一个组件，和 Tabs 同一类。
 *
 * 桌面横排导航与手机汉堡按钮**同时渲染**，由所在 `.lc-sh` 页头的容器查询决定显示哪个
 * （见 blocks.css）：编辑器画布、预览都可能处在窄容器而非窄视口，所以不用 `matchMedia`；
 * 这样也没有水合不一致。抽屉只在点开时渲染，定位相对于页头（本组件自身不设 position）。
 */
import * as React from "react";

import { cx, objectStyle, passthrough } from "./block-kit";
import {
  type NavItem,
  type NavLink,
  isItemActive,
  isLinkActive,
  normalizeNavItems,
} from "./navbar.model";

type Props = Record<string, unknown>;

function linkAttrs(link: { target: string }) {
  const blank = link.target === "_blank";
  return {
    target: blank ? "_blank" : undefined,
    rel: blank ? "noopener noreferrer" : undefined,
  };
}

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
            // 没填地址的菜单项也要能被键盘选中：占位项不该成为键盘导航的断点
            tabIndex={0}
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
  const itemRef = React.useRef<HTMLLIElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  // 键盘「↓/↑」打开菜单后要把焦点送进去，但菜单是打开后才渲染的，所以先记下意图，渲染后再聚焦。
  const pendingFocus = React.useRef<"first" | "last" | null>(null);

  const menuLinks = (): HTMLAnchorElement[] =>
    Array.from(itemRef.current?.querySelectorAll<HTMLAnchorElement>(".lc-sh-dropdown-link") ?? []);

  React.useEffect(() => {
    if (!open || !pendingFocus.current) return;
    const links = Array.from(
      itemRef.current?.querySelectorAll<HTMLAnchorElement>(".lc-sh-dropdown-link") ?? [],
    );
    const target = pendingFocus.current === "last" ? links[links.length - 1] : links[0];
    pendingFocus.current = null;
    target?.focus();
  }, [open]);

  if (item.children.length === 0) {
    return (
      <li className="lc-sh-item">
        <a
          className={cx("lc-sh-link", active && "is-active")}
          aria-current={active ? "page" : undefined}
          href={item.href || undefined}
          tabIndex={0}
          {...linkAttrs(item)}
        >
          {item.label}
        </a>
      </li>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      onOpenChange(false);
      buttonRef.current?.focus();
      return;
    }
    const onTrigger = event.target === buttonRef.current;
    if (onTrigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const which = event.key === "ArrowDown" ? "first" : "last";
      if (open) {
        const links = menuLinks();
        (which === "last" ? links[links.length - 1] : links[0])?.focus();
      } else {
        pendingFocus.current = which;
        onOpenChange(true);
      }
      return;
    }
    if (!onTrigger && open) {
      const links = menuLinks();
      const index = links.indexOf(event.target as HTMLAnchorElement);
      if (index < 0) return;
      const last = links.length - 1;
      let next: number | null = null;
      if (event.key === "ArrowDown") next = index === last ? 0 : index + 1;
      else if (event.key === "ArrowUp") next = index === 0 ? last : index - 1;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      if (next !== null) {
        event.preventDefault();
        links[next]?.focus();
      }
    }
  };

  // 悬停只认鼠标指针：触屏轻点会合成 mouseenter，若也算悬停，随后的 click 会把刚开的菜单又关掉，
  // 平板横屏（桌面导航）就点不开下拉了。
  const lastPointer = React.useRef("");
  const handleTriggerClick = () => {
    // 鼠标点击时菜单已被悬停打开：保持打开，别把它切回关闭；键盘 / 触屏才是真正的开关
    onOpenChange(lastPointer.current === "mouse" ? true : !open);
    lastPointer.current = "";
  };

  return (
    <li
      ref={itemRef}
      className="lc-sh-item"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onOpenChange(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onOpenChange(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false);
      }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cx("lc-sh-link", "lc-sh-trigger", active && "is-active")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType;
        }}
        onClick={handleTriggerClick}
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

function MobileMenu({
  id,
  items,
  activePath,
  onClose,
}: {
  id: string;
  items: NavItem[];
  activePath: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  return (
    <div className="lc-sh-mobile" id={id}>
      <ul className="lc-sh-mobile-list">
        {items.map((item) => {
          const active = isItemActive(item, activePath);
          if (item.children.length === 0) {
            return (
              <li key={item.id}>
                <a
                  className={cx("lc-sh-mobile-link", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  href={item.href || undefined}
                  tabIndex={0}
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
                          isLinkActive(child, activePath) && "is-active",
                        )}
                        onClick={onClose}
                        href={child.href || undefined}
                        tabIndex={0}
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
    </div>
  );
}

export function Navbar(props: Props) {
  const items = normalizeNavItems(props.items);
  const activePath = typeof props.activePath === "string" ? props.activePath.trim() : "";
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navRef = React.useRef<HTMLElement | null>(null);
  const burgerRef = React.useRef<HTMLButtonElement | null>(null);
  const mobileId = `lc-sh-mobile-${React.useId().replace(/:/g, "")}`;

  // 点到导航之外收起下拉 / 抽屉；监听挂在节点所属 document 上（编辑器画布是 iframe）。
  const anyOpen = openId !== null || mobileOpen;
  React.useEffect(() => {
    if (!anyOpen) return;
    const doc = navRef.current?.ownerDocument;
    if (!doc) return;
    const onPointerDown = (event: Event) => {
      if (navRef.current?.contains(event.target as Node)) return;
      setOpenId(null);
      setMobileOpen(false);
    };
    doc.addEventListener("pointerdown", onPointerDown);
    return () => doc.removeEventListener("pointerdown", onPointerDown);
  }, [anyOpen]);

  if (items.length === 0) return null;

  return (
    <nav
      ref={navRef}
      {...passthrough(props)}
      className={cx("lc-nav", "lc-sh-nav")}
      aria-label="主导航"
      style={objectStyle(props.style)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          burgerRef.current?.focus();
        }
      }}
    >
      <ul className="lc-sh-list">
        {items.map((item) => (
          <DesktopNavItem
            key={item.id}
            item={item}
            activePath={activePath}
            open={openId === item.id}
            onOpenChange={(next) => setOpenId(next ? item.id : null)}
          />
        ))}
      </ul>
      <button
        ref={burgerRef}
        type="button"
        className="lc-sh-burger"
        aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
        aria-expanded={mobileOpen}
        aria-controls={mobileId}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span className="lc-sh-burger-bars" aria-hidden="true" />
      </button>
      {mobileOpen ? (
        <MobileMenu
          id={mobileId}
          items={items}
          activePath={activePath}
          onClose={() => setMobileOpen(false)}
        />
      ) : null}
    </nav>
  );
}
