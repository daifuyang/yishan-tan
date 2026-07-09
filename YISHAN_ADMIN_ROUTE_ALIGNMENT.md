# yishan-admin 与 yishan-tan 同路由页面对照

> 目的：按 `yishan-admin` 现有页面为准，整理 `yishan-tan` 对应路由的列表筛选字段、表格字段、行为按钮、新增/编辑表单字段，供后续逐页对齐使用。
>
> 说明：
> - **不做设计建议，不补充主观方案**
> - **完全以旧项目 `apps/yishan-admin` 当前代码为准**
> - 如旧项目没有同名/同职责页面，直接注明“无直接对应页面”

## 1. 用户管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/user/index.tsx`
  - 表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/user/components/UserForm.tsx`
- tan 页面：
  - `src/routes/admin/users.tsx`

### 旧项目列表筛选字段

- 用户名
- 姓名
- 昵称
- 邮箱
- 手机号
- 状态

### 旧项目表格字段

- ID
- 用户名
- 姓名
- 昵称
- 邮箱
- 手机号
- 状态
- 最后登录
- 创建时间
- 操作

### 旧项目行为按钮

- 工具栏：
  - 新建
- 行内：
  - 编辑
  - 禁用 / 启用
  - 删除
- 批量：
  - 批量删除
  - 批量导出

### 旧项目新增/编辑表单字段

- 登录名称
- 归属部门
- 手机号码
- 邮箱
- 真实姓名
- 用户昵称
- 用户密码
- 用户性别
- 状态
- 岗位
- 角色
- 出生日期
- 备注

### tan 当前情况

- 列表筛选字段：
  - 用户名
  - 姓名
  - 昵称
  - 邮箱
  - 手机号
  - 状态
- 表格字段：
  - 用户名
  - 姓名
  - 昵称
  - 邮箱
  - 手机号
  - 状态
  - 最后登录
  - 创建时间
  - 操作
- 行为按钮：
  - 工具栏：新增、批量停用
  - 行内：编辑、禁用/启用、更多→重置密码（占位）、删除
- 新增/编辑表单字段：
  - 登录名称
  - 手机号码
  - 邮箱
  - 真实姓名
  - 用户昵称
  - 用户密码
  - 归属部门
  - 岗位
  - 业务角色
  - 出生日期
  - 备注
  - 性别
  - 状态

### 差别

- tan 去掉了列表 `ID` 列
- tan 把“角色”文案写成了“业务角色”
- tan 批量操作是“批量停用”，旧项目是“批量删除 / 批量导出”
- tan 的“重置密码”目前只是占位项，旧项目没有这个按钮

---

## 2. 角色管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/role/index.tsx`
  - 表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/role/components/RoleForm.tsx`
- tan 页面：
  - `src/routes/admin/roles.tsx`

### 旧项目列表筛选字段

- 角色名称
- 状态

### 旧项目表格字段

- ID
- 角色名称
- 角色描述
- 系统角色
- 数据权限
- 状态
- 创建时间
- 更新时间
- 操作

### 旧项目行为按钮

- 工具栏：
  - 新建
- 行内：
  - 编辑
  - 删除
  - 更多→禁用 / 启用
- 批量：
  - 批量删除

### 旧项目新增/编辑表单字段

- 角色名称
- 角色状态
- 数据权限
- 角色描述
- 菜单权限
  - 展开/折叠
  - 全选/全不选
  - 父子联动
  - 菜单树勾选

### tan 当前情况

- 列表筛选字段：
  - 名称
  - 描述
  - 状态
  - 创建时间
- 表格字段：
  - 角色名称
  - 角色描述
  - 系统角色
  - 数据权限
  - 状态
  - 创建时间
  - 更新时间
  - 操作
- 行为按钮：
  - 工具栏：新建角色
  - 行内：编辑、删除、更多→禁用 / 启用
- 新增/编辑表单字段：
  - 名称
  - 状态
  - 菜单权限
  - 数据权限
  - 描述

### 差别

- tan 去掉了列表 `ID` 列
- tan 新增了筛选字段：描述、创建时间
- 旧项目表单里的“菜单权限控制项”是显式 checkbox；tan 用自己的菜单树组件
- tan 工具栏文案是“新建角色”，旧项目是“新建”

---

## 3. 部门管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/department/index.tsx`
  - 表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/department/components/DepartmentForm.tsx`
- tan 页面：
  - `src/routes/admin/departments.tsx`

### 旧项目列表筛选字段

- 部门名称
- 状态

### 旧项目表格字段

- ID
- 部门名称
- 上级部门
- 负责人
- 排序
- 创建时间
- 更新时间
- 状态
- 操作

### 旧项目行为按钮

- 工具栏：
  - 新建
- 行内：
  - 编辑
  - 禁用 / 启用
  - 删除
- 批量：
  - 批量删除
  - 批量导出

### 旧项目新增/编辑表单字段

- 上级部门
- 部门名称
- 状态
- 排序
- 部门描述
- 负责人ID

### tan 当前情况

- 列表筛选字段：
  - 部门名称
  - 状态
- 表格字段：
  - 部门名称
  - 上级部门
  - 负责人
  - 排序
  - 创建时间
  - 更新时间
  - 状态
  - 操作
- 行为按钮：
  - 工具栏：新建
  - 行内：编辑、禁用 / 启用、删除
- 新增/编辑表单字段：
  - 部门名称
  - 上级部门
  - 排序
  - 负责人
  - 状态

### 差别

- tan 去掉了列表 `ID` 列
- 旧项目表单有“部门描述”“负责人ID”；tan 当前表单没有“部门描述”，负责人改成选择器
- 旧项目有批量删除、批量导出；tan 当前没有

---

## 4. 菜单管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/menu/index.tsx`
  - 表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/menu/components/MenuForm.tsx`
- tan 页面：
  - `src/routes/admin/menus.tsx`

### 旧项目列表筛选字段

- 无

### 旧项目表格字段

- ID
- 菜单名称
- 路由地址
- 组件
- 图标
- 排序
- 创建时间
- 更新时间
- 状态
- 操作

### 旧项目行为按钮

- 工具栏：
  - 新建
- 行内：
  - 编辑
  - 禁用 / 启用
  - 删除
- 批量：
  - 批量删除

### 旧项目新增/编辑表单字段

- 上级菜单
- 菜单类型
- 菜单图标（目录/菜单）
- 显示排序
- 菜单名称
- 路由地址（目录/菜单）
- 是否外链（目录/菜单）
- 组件路径（菜单）
- 显示状态
- 菜单状态
- 权限标识（按钮）
- 是否缓存（菜单）

### tan 当前情况

- 列表筛选字段：
  - 关键字
  - 类型
  - 状态
- 表格字段：
  - 名称
  - 类型
  - 路径
  - 权限标识
  - 排序
  - 状态
  - 操作
- 行为按钮：
  - 工具栏：新建顶级菜单
  - 行内：编辑、禁用 / 启用、删除
- 新增/编辑表单字段：
  - 名称
  - 类型
  - 路径
  - 组件
  - 权限标识
  - 图标
  - 排序
  - 父级
  - 状态

### 差别

- tan 去掉了列表 `ID / 组件 / 图标 / 创建时间 / 更新时间` 列
- tan 新增了筛选字段，旧项目列表没有筛选区
- 旧项目表单有 `是否外链 / 显示状态 / 是否缓存`；tan 当前表单没有这些字段
- tan 把“上级菜单”文案写成了“父级”

---

## 5. 岗位管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/post/index.tsx`
  - 表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/post/components/PostForm.tsx`
- tan 页面：
  - `src/routes/admin/posts.tsx`

### 旧项目列表筛选字段

- 关键词
- 状态

### 旧项目表格字段

- ID
- 岗位名称
- 排序
- 岗位描述
- 创建时间
- 更新时间
- 状态
- 操作

### 旧项目行为按钮

- 工具栏：
  - 新建
- 行内：
  - 编辑
  - 禁用 / 启用
  - 删除
- 批量：
  - 批量删除

### 旧项目新增/编辑表单字段

- 岗位名称
- 状态
- 排序
- 岗位描述

### tan 当前情况

- 列表筛选字段：
  - 名称
  - 部门
  - 排序起
  - 状态
  - 创建时间
- 表格字段：
  - 名称
  - 部门
  - 排序
  - 关联用户
  - 状态
  - 创建时间
  - 操作
- 行为按钮：
  - 工具栏：新建岗位
  - 行内：编辑、禁用 / 启用、删除
- 新增/编辑表单字段：
  - 名称
  - 所属部门
  - 排序
  - 状态

### 差别

- tan 去掉了列表 `ID / 岗位描述 / 更新时间` 列
- tan 新增了 `部门 / 关联用户` 列
- tan 新增了 `部门 / 排序起 / 创建时间` 筛选
- 旧项目表单有“岗位描述”；tan 当前表单没有
- tan 表单新增了“所属部门”

---

## 6. 字典管理

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/dict/index.tsx`
  - 字典类型表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/dict/components/DictTypeForm.tsx`
  - 字典数据抽屉：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/dict/components/DictDataManager.tsx`
  - 字典数据表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/dict/components/DictDataForm.tsx`
- tan 页面：
  - `src/routes/admin/dicts.tsx`
  - `src/routes/admin/dicts/$typeCode.tsx`

### 旧项目字典类型列表筛选字段

- 字典名称
- 字典类型
- 状态

### 旧项目字典类型表格字段

- 字典编号
- 字典名称
- 字典类型
- 备注
- 创建时间
- 状态
- 操作

### 旧项目字典类型行为按钮

- 工具栏：
  - 新建
- 行内：
  - 修改
  - 删除
  - 更多→停用 / 启用
  - 更多→查看字典数据
- 批量：
  - 批量删除

### 旧项目字典类型新增/编辑表单字段

- 字典名称
- 字典类型
- 状态
- 排序
- 备注

### 旧项目字典数据列表筛选字段

- 字典标签
- 字典键值
- 状态

### 旧项目字典数据表格字段

- 字典编号
- 字典标签
- 字典键值
- 字典排序
- 备注
- 默认状态
- 创建时间
- 状态
- 操作

### 旧项目字典数据行为按钮

- 工具栏：
  - 新建
- 行内：
  - 修改
  - 删除
  - 停用 / 启用
  - 取消默认 / 设为默认
- 批量：
  - 批量删除

### 旧项目字典数据新增/编辑表单字段

- 字典标签
- 字典键值
- 状态
- 排序
- 标签样式
- 默认值
- 备注

### tan 当前情况

- 字典类型列表筛选字段：
  - 名称
  - 编码
  - 描述
  - 状态
  - 创建时间
- 字典类型表格字段：
  - 名称
  - 编码
  - 描述
  - 字典数据
  - 状态
  - 创建时间
  - 操作
- 字典类型行为按钮：
  - 工具栏：新建字典类型
  - 行内：编辑、删除、禁用 / 启用、查看数据
- 字典类型新增/编辑表单字段：
  - 名称
  - 编码
  - 描述
  - 状态

- 字典数据列表筛选字段：
  - 标签
  - 值
  - 描述
  - 状态
  - 创建时间
- 字典数据表格字段：
  - 标签
  - 值
  - 排序
  - 描述
  - 状态
  - 创建时间
  - 操作
- 字典数据行为按钮：
  - 工具栏：新建字典数据
  - 行内：编辑、删除
- 字典数据新增/编辑表单字段：
  - 标签
  - 值
  - 排序
  - 状态
  - 描述

### 差别

- tan 去掉了字典类型列表 `字典编号` 列，新增了 `编码 / 描述 / 字典数据` 列
- 旧项目字典类型表单有 `排序`；tan 当前没有
- tan 把旧项目“字典类型”字段改成了“编码”
- tan 字典数据页去掉了 `字典编号 / 默认状态 / 标签样式 / 设为默认动作`
- 旧项目字典数据表单有 `标签样式 / 默认值 / 备注`；tan 当前没有
- tan 字典数据筛选新增了“创建时间”，旧项目没有

---

## 7. 登录日志

- 旧项目页面：
  - 列表页：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/login-log/index.tsx`
- tan 页面：
  - `src/routes/admin/login-logs.tsx`

### 旧项目列表筛选字段

- 账号
- 状态

### 旧项目表格字段

- ID
- 账号
- 姓名
- 状态
- 提示信息
- IP
- User-Agent
- 创建时间

### 旧项目行为按钮

- 无

### 旧项目新增/编辑表单字段

- 无

### tan 当前情况

- 列表筛选字段：
  - 用户名
  - 状态
  - IP
  - User Agent
  - 登录时间
- 表格字段：
  - 账号
  - IP
  - User Agent
  - 状态
  - 消息
  - 登录时间
  - 操作
- 行为按钮：
  - 行内：查看详情
- 表单：
  - 无

### 差别

- tan 去掉了 `ID / 姓名` 列
- tan 新增了 `操作` 列和详情抽屉
- tan 新增了 `IP / User Agent / 登录时间` 筛选

---

## 8. 云存储

- 旧项目页面：
  - 页面：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/storage/index.tsx`
- tan 页面：
  - `src/routes/admin/storages.tsx`

### 旧项目列表筛选字段

- 无列表页

### 旧项目表格字段

- 无列表页

### 旧项目行为按钮

- 刷新
- 导出配置
- 导入配置
- 保存

### 旧项目新增/编辑表单字段

- 服务商
- 七牛云配置：
  - AccessKey
  - SecretKey
  - Bucket
  - 区域
  - 外链域名
  - 上传域名
  - 使用 HTTPS
  - 使用 CDN 域名
  - 上传凭证过期(秒)
  - 回调地址
- 阿里云 OSS 配置：
  - AccessKeyId
  - AccessKeySecret
  - Bucket
  - Region
  - Endpoint
  - 外链域名
  - 使用 HTTPS

### tan 当前情况

- 列表筛选字段：
  - 名称
  - 驱动
  - 是否默认
  - 状态
  - 创建时间
- 表格字段：
  - 名称
  - 驱动
  - 是否默认
  - 描述
  - 状态
  - 创建时间
  - 操作
- 行为按钮：
  - 工具栏：新建存储
  - 行内：编辑、删除、禁用 / 启用、设为默认
- 新增/编辑表单字段：
  - 名称
  - 驱动
  - 设为默认驱动
  - 描述
  - 状态
  - 驱动配置（按驱动动态变化）

### 差别

- **旧项目不是列表页，tan 是列表页**
- 旧项目是单页配置模式；tan 是“多存储记录”模式
- 旧项目按钮是 `刷新 / 导入 / 导出 / 保存`；tan 是 `新建 / 编辑 / 删除 / 禁用 / 设默认`
- 两边数据结构和交互方式都不一样，只能算“同业务域”，不能算同版式对齐

---

## 9. 媒体库

- 旧项目页面：
  - 页面：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/attachments/index.tsx`
  - 素材编辑表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/attachments/components/AttachmentForm.tsx`
  - 分组表单：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/attachments/components/AttachmentFolderForm.tsx`
- tan 页面：
  - `src/routes/admin/attachments.tsx`

### 旧项目列表筛选字段

- 左侧分组树选择
- 分组搜索
- 类型 Tab：
  - 全部
  - 图片
  - 音频
  - 视频
  - 其他

### 旧项目表格/列表字段

- 旧项目不是表格
- 素材卡片信息包含：
  - 缩略图/预览
  - 文件名
  - 类型
  - 文件大小
  - 分组

### 旧项目行为按钮

- 分组区：
  - 新建分组
  - 新建子分组
  - 编辑分组
  - 删除分组
- 素材区：
  - 上传
  - 批量删除
  - 取消选择
  - 编辑素材
  - 删除素材
  - 预览（媒体）

### 旧项目新增/编辑表单字段

- 素材编辑表单：
  - 素材名称
  - 分组
  - 状态
- 分组新增/编辑表单：
  - 上级分组
  - 分组名称
  - 分组类型
  - 状态
  - 排序
  - 备注

### tan 当前情况

- 列表筛选字段：
  - 文件名
  - MIME 类型
  - 分类
  - 上传时间
- 表格字段：
  - 缩略图
  - 文件名
  - 分类
  - 大小
  - 存储驱动
  - 上传者
  - 上传时间
  - 操作
- 行为按钮：
  - 工具栏：上传文件
  - 行内：复制链接、删除
- 表单：
  - 无新增/编辑素材表单
  - 无分组管理表单

### 差别

- **旧项目是“分组树 + 素材卡片库”模式，tan 是表格列表模式**
- 旧项目有分组管理；tan 当前没有分组管理表单
- 旧项目有素材编辑表单；tan 当前没有
- tan 新增了 `MIME 类型 / 上传者 / 存储驱动` 维度；旧项目没有对应表格列

---

## 10. 站点配置

- 旧项目页面：
  - 页面：`/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/system/site/index.tsx`
- tan 页面：
  - `src/routes/admin/settings.tsx`

### 旧项目列表筛选字段

- 无

### 旧项目表格字段

- 无

### 旧项目行为按钮

- 保存

### 旧项目新增/编辑表单字段

- 站点名称
- 站点域名
- 站点标题
- LOGO 地址
- Favicon 地址
- SEO 关键词
- SEO 描述
- ICP备案号
- 公安备案号
- 联系邮箱
- 联系电话
- 联系地址
- 页脚内容

### tan 当前情况

- 无列表页
- 无单一扁平表单
- 当前按分组保存：
  - 站点信息
    - 站点名称
    - 站点 Logo
    - 页脚版权
  - 登录策略
    - 登录失败最大次数
    - 锁定时长（分钟）
    - 启用图形验证码
    - 密码最小长度
  - 上传限制
    - 单文件最大尺寸（MB）
    - 允许的文件类型
    - 默认存储驱动
  - 界面偏好
    - 默认主题
    - 显示面包屑
    - 表格密度

### 差别

- **旧项目是单页基础站点信息表单；tan 是按组拆分的系统选项页**
- tan 当前没有旧项目里的 `站点域名 / 站点标题 / Favicon / SEO / 备案 / 联系方式` 等字段
- tan 当前新增了 `登录策略 / 上传限制 / 界面偏好` 这类旧项目没有的分组

---

## 11. 门户管理

- 旧项目页面：
  - `yishan-admin` 下没有与 `src/routes/admin/portals.tsx` **直接同名、同职责**的单页
  - 旧项目门户相关页面拆分为：
    - `/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/portal/pages/index.tsx`
    - `/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/portal/articles/index.tsx`
    - `/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/portal/categories/index.tsx`
    - `/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/portal/page-templates/index.tsx`
    - `/home/dfy/workspace/products/yishan/apps/yishan-admin/src/pages/portal/article-templates/index.tsx`
- tan 页面：
  - `src/routes/admin/portals.tsx`

### 旧项目列表筛选字段

- 无直接对应单页，无法按同一页面整理

### 旧项目表格字段

- 无直接对应单页，无法按同一页面整理

### 旧项目行为按钮

- 无直接对应单页，无法按同一页面整理

### 旧项目新增/编辑表单字段

- 无直接对应单页，无法按同一页面整理

### tan 当前情况

- 列表筛选字段：
  - 名称/编码/域名
  - 是否默认
  - 状态
  - 创建时间
- 表格字段：
  - 名称
  - 编码
  - 域名
  - 主题
  - 状态
  - 创建时间
  - 操作
- 行为按钮：
  - 工具栏：新建门户
  - 行内：编辑、删除、禁用 / 启用、设为默认
- 新增/编辑表单字段：
  - 名称
  - 编码
  - 域名
  - Logo URL
  - 主题主色
  - 主题模式
  - 设为默认门户
  - 描述
  - 状态

### 差别

- 旧项目没有可以与 tan `portals.tsx` 一一对应的单页
- 旧项目门户能力是拆散在多个页面中的，不能直接按单页面字段对齐

