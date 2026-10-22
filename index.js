/**
 * 配置码 / Loadout code — a shareable description of one person's DSH setup.
 *
 * A character string anyone can paste, showing what the author installed and how
 * they tuned core behaviour, without carrying keys, endpoints or personal data.
 * The receiving side parses it into a list and picks what to take.
 *
 * Division of labour: this Host half owns what only a Host can see — the profile
 * package list and the Loader's live inherited/override configuration through
 * `configEditor`. The Client half owns every word the user reads.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

const PREFIX = 'LOAD1'
const ROUTE = '/loadout'
const API = `${ROUTE}/api`
const SELF = 'dsh-loadout'

/** Fields whose values are personal or secret, and never enter a code. */
const REDACTED = /(api[-_]?key|access[-_]?key|private[-_]?key|secret|token|passw(or)?d|authori[sz]ation|cookie|credential|base[-_]?url|endpoint|proxy|license|phone|邮箱|手机)/i
/** One-shot "already seen this" state: true of the author's install, meaningless elsewhere. */
const LOCAL_STATE = /(^|\.)(step|welcomeNoticeVersion|last[A-Za-z]*At)$/
/** Bare-value hazards: local absolute paths and addresses that identify a person. */
const ABSOLUTE_PATH = /^([a-z]:[\\/]|\\\\|\/(home|Users|root)\/)/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function profileDir() {
	if (process.env.DSH_PROFILE_DIR) return process.env.DSH_PROFILE_DIR
	const profile = process.env.DSH_PROFILE ?? 'desktop'
	return join(homedir(), '.dsh', 'profiles', profile)
}

/** Package names that are safe to hand to the package manager. */
const SAFE_NAME = /^(@[a-z0-9][a-z0-9-._~]*\/)?[a-z0-9][a-z0-9-._~]*$/i
/** Dependency value forms that only resolve against the author's own disk. */
const LOCAL_DEP = /^(link:|file:|workspace:|portal:|git\+|https?:|\.{0,2}[\\/]|[a-z]:[\\/])/i

/** The plugin packages this profile installed — the "what" half of a loadout. */
async function readBundles() {
	let pkg
	try {
		pkg = JSON.parse(await readFile(join(profileDir(), 'package.json'), 'utf8'))
	} catch {
		return []
	}
	const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
	const names = new Set(Object.keys(deps))
	const listed = Array.isArray(pkg.bundles) ? pkg.bundles : []
	for (const name of listed) if (typeof name === 'string') names.add(name)
	names.delete(SELF)

	const bundles = []
	for (const name of names) {
		let manifest
		try {
			manifest = JSON.parse(await readFile(join(profileDir(), 'node_modules', name, 'package.json'), 'utf8'))
		} catch {
			continue
		}
		const version = typeof manifest.version === 'string' ? manifest.version : undefined
		// A link:/file:/git dependency exists only on this machine, so it cannot travel in a code.
		const local = typeof deps[name] === 'string' && LOCAL_DEP.test(deps[name].trim())
		bundles.push({
			name: manifest.name ?? name,
			version,
			description: typeof manifest.description === 'string' ? manifest.description : undefined,
			spec: local ? undefined : version ? `${manifest.name ?? name}@${version}` : manifest.name ?? name,
			local,
		})
	}
	return bundles.sort((a, b) => a.name.localeCompare(b.name))
}

/** Flatten to dotted leaf paths; arrays are leaves, not containers. */
function leaves(value, prefix = '', out = {}) {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		if (prefix) out[prefix] = value
		return out
	}
	for (const [key, child] of Object.entries(value)) {
		leaves(child, prefix ? `${prefix}.${key}` : key, out)
	}
	return out
}

function pick(object, path) {
	let cursor = object
	for (const key of path.split('.')) {
		if (cursor === null || typeof cursor !== 'object') return undefined
		cursor = cursor[key]
	}
	return cursor
}

function put(object, path, value) {
	const keys = path.split('.')
	let cursor = object
	for (let index = 0; index < keys.length - 1; index += 1) {
		const key = keys[index]
		if (cursor[key] === null || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) cursor[key] = {}
		cursor = cursor[key]
	}
	cursor[keys[keys.length - 1]] = value
	return object
}

/** Remove one dotted leaf, pruning containers it leaves empty. */
function drop(object, path) {
	const keys = path.split('.')
	const trail = []
	let cursor = object
	for (let index = 0; index < keys.length - 1; index += 1) {
		const key = keys[index]
		if (cursor === null || typeof cursor !== 'object') return object
		trail.push([cursor, key])
		cursor = cursor[key]
	}
	if (cursor === null || typeof cursor !== 'object') return object
	delete cursor[keys[keys.length - 1]]
	for (let index = trail.length - 1; index >= 0; index -= 1) {
		const [owner, key] = trail[index]
		const child = owner[key]
		if (child && typeof child === 'object' && Object.keys(child).length === 0) delete owner[key]
	}
	return object
}

/** A patch id is a coordinate; a person reads a purpose. */
const TITLES = {
	'ui-theme': '外观',
	'ui-chat': '对话呈现',
	'ui-conversation': '输入框行为',
	'agent-default-model': '默认模型',
	'agent-preset-registry': '预设选择',
	'llm-pi-ai': '自定义模型提供方',
	'web-search-deepseek': '网页搜索',
	'ui-settings-account': '账户与引导',
	'ui-settings-general': '通用设置',
	'ui-settings-models': '模型列表',
}

/** What each package gives the person using it — meaning, not package id. */
const BUNDLE_ABOUT = {
	'dsh-plugin-wallpaper-engine': '给界面铺一层动态壁纸：可放本地视频或图片当背景',
	'dsh-plugin-whale-pet': '在桌面养一只鲸鱼，随对话状态有动作',
	'dsh-whale-widget': '角落的鲸鱼挂件，显示当前状态',
	'dsh-codex-approval': '审批弹窗换成 Codex 风格（快捷批准/拒绝）',
	'dshmarket': '插件市场：在 DSH 里搜索并安装插件，不用命令行',
	'billion-context': '上下文压缩：长会话自动折成摘要，腾出上下文窗口',
	'dsh-routing-suite': '多模型路由：按任务把请求分给不同 provider，附状态页',
	'@vectorize-io/hindsight-coding-agents': '长期记忆：把过往会话沉淀成可检索的知识页',
	'@linxin666/dsh-client-ui-git-graph': '侧栏 Git 提交图谱，看仓库历史分支',
	'@deepseek-ai/dsh-experimental-auto-review': '实验性自动审阅：模型自动复查改动并给意见',
}

/** Leaf name → what that field controls, in words. */
const FIELD_ABOUT = {
	preference: '界面主题',
	fontSize: '字号',
	transcriptView: '对话显示方式',
	performanceUsage: '性能用量展示',
	provider: '模型提供方',
	model: '模型',
	reasoningEffort: '推理强度',
	default: '默认预设',
	selectedDefault: '选中的预设',
	enabled: '开关',
	api: '协议',
	models: '模型列表',
	usage: '用量展示',
	developerTools: '开发者工具',
	process: '处理流程',
	completion: '完成方式',
	step: '引导进度',
}

/** Known value vocabularies, keyed by `patchId.field`. */
const VALUE_ABOUT = {
	'ui-theme.preference': { dark: '深色', light: '浅色', system: '跟随系统' },
	'ui-chat.transcriptView': { standard: '标准，每条消息完整铺开', compact: '紧凑，省去过程细节' },
	'ui-chat.performanceUsage': { detailed: '详细，显示 token 与耗时', simple: '简洁，不显示用量' },
	'agent-default-model.reasoningEffort': { high: '高，回答前先想更久', medium: '中', low: '低', minimal: '关闭' },
}

function shortValue(value) {
	if (Array.isArray(value)) return `${value.length} 项`
	if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 27)}…` : value
	const json = JSON.stringify(value) ?? String(value)
	return json.length > 28 ? `${json.slice(0, 27)}…` : json
}

/** Loader entry ids carry an `include:` prefix; codes use the bare patch id. */
function bareId(patchId) {
	return String(patchId ?? '').replace(/^include:/, '')
}

/** Turn one entry's changed fields into a sentence a recipient can act on. */
function describeConfig(patchId, patch) {
	// Model providers read far better grouped per provider than as dotted leaves.
	if (patchId === 'llm-pi-ai') {
		const byProvider = new Map()
		for (const [path, value] of Object.entries(patch)) {
			const parts = path.split('.')
			const provider = parts[0] === 'providers' ? parts[1] : '全局'
			if (!byProvider.has(provider)) byProvider.set(provider, [])
			const field = parts[parts.length - 1]
			const label = field === 'models' ? `${Array.isArray(value) ? value.length : 0} 个模型`
				: field === 'api' ? `协议 ${shortValue(value)}`
				: `${FIELD_ABOUT[field] ?? field} ${shortValue(value)}`
			byProvider.get(provider).push(label)
		}
		return [...byProvider].map(([provider, facts]) => `模型提供方「${provider}」：${facts.join('，')}`).join('；')
	}
	const parts = []
	for (const [path, value] of Object.entries(patch)) {
		const field = path.split('.').pop()
		const label = FIELD_ABOUT[field] ?? field
		const vocabulary = VALUE_ABOUT[`${patchId}.${field}`] ?? VALUE_ABOUT[path] ?? {}
		parts.push(`${label}设为「${vocabulary[value] ?? shortValue(value)}」`)
	}
	const head = parts.slice(0, 4).join('，')
	return parts.length > 4 ? `${head} 等 ${parts.length} 项` : head
}

/** Entries that store this install's onboarding state, not a shareable preference. */
const LOCAL_ENTRIES = new Set(['ui-settings-account', 'ui-settings-general'])

function acceptable(path, value) {
	if (REDACTED.test(path)) return false
	if (typeof value === 'string') {
		if (ABSOLUTE_PATH.test(value)) return false
		if (EMAIL.test(value)) return false
	}
	return true
}

/** One tuning item per Loader entry, carrying only what the person changed. */
function tuningFrom(configEditor, bundles) {
	const rows = configEditor.configuration()
	const names = new Set(bundles.map((bundle) => bundle.name))
	const items = []
	const stripped = []
	for (const row of rows) {
		const patchId = bareId(row.entry?.patchId ?? row.entry?.id)
		const name = row.entry?.name
		if (!patchId || name === SELF) continue
		if (LOCAL_ENTRIES.has(patchId)) continue
		const override = row.override ?? {}
		const inherited = row.inherited ?? {}
		const fromBundle = names.has(name)
		// A bundle's own row is already represented by the bundle item.
		if (fromBundle) continue
		const inheritedLeaves = leaves(inherited)
		const changed = {}
		for (const [path, value] of Object.entries(leaves(override))) {
			// null/undefined means "unset": importing it would change nothing.
			if (value === null || value === undefined) continue
			if (LOCAL_STATE.test(path)) continue
			// `version` is a schema marker; `enabled: true` is the default state, not a choice.
			if (path === 'version' || path.endsWith('.version')) continue
			if (path === 'enabled' && value === true) continue
			if (path in inheritedLeaves && JSON.stringify(inheritedLeaves[path]) === JSON.stringify(value)) continue
			if (!acceptable(path, value)) {
				stripped.push(path)
				continue
			}
			changed[path] = value
		}
		const paths = Object.keys(changed)
		if (paths.length === 0) continue
		items.push({
			id: `config:${patchId}`,
			kind: 'config',
			patchId,
			effect: TITLES[patchId] ?? patchId.replace(/^include:/, ''),
			about: describeConfig(patchId, changed),
			note: paths.slice(0, 3).join(' · ') + (paths.length > 3 ? ` … +${paths.length - 3}` : ''),
			patch: changed,
		})
	}
	return { items, stripped }
}

function encodePayload(payload) {
	const json = JSON.stringify(payload)
	// Deflate keeps a full loadout near a QR-code-sized string instead of a page of base64.
	const body = deflateRawSync(Buffer.from(json, 'utf8'), { level: 9 }).toString('base64url')
	const sum = createHash('sha256').update(json, 'utf8').digest('hex').slice(0, 8)
	return `${PREFIX}.${body}.${sum}`
}

function decodePayload(code) {
	const text = String(code ?? '').trim().replace(/\s+/g, '')
	const match = /^LOAD1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/.exec(text)
	if (!match) throw new Error('不是有效的配置码（应以 LOAD1. 开头，且未被截断）')
	let json
	try {
		json = inflateRawSync(Buffer.from(match[1], 'base64url')).toString('utf8')
	} catch {
		throw new Error('配置码内容损坏，无法解码')
	}
	const sum = createHash('sha256').update(json, 'utf8').digest('hex').slice(0, 8)
	if (sum !== match[2]) throw new Error('配置码校验失败，可能被改动过')
	const payload = JSON.parse(json)
	if (payload?.v !== 1 || !Array.isArray(payload.items)) throw new Error('配置码版本不受支持')
	return payload
}

/** Local view of one decoded item: what would change on this install. */
function inspect(item, configEditor, localBundles) {
	if (item.kind === 'bundle') {
		return { ...item, installed: localBundles.has(item.name), status: localBundles.has(item.name) ? 'same' : 'missing' }
	}
	const row = configEditor.configuration().find((candidate) => bareId(candidate.entry?.patchId ?? candidate.entry?.id) === item.patchId)
	const local = row ? leaves(row.override ?? {}) : {}
	const rows = []
	let differ = 0
	for (const [path, value] of Object.entries(item.patch ?? {})) {
		const same = JSON.stringify(local[path]) === JSON.stringify(value)
		if (!same) differ += 1
		rows.push({ path, value, local: local[path], same })
	}
	return { ...item, rows, status: differ === 0 ? 'same' : 'fresh', local: row ? true : false }
}

function send(response, status, value) {
	response.statusCode = status
	response.setHeader('content-type', 'application/json; charset=utf-8')
	response.setHeader('cache-control', 'no-store')
	response.end(JSON.stringify(value))
}

async function readJson(request) {
	let text = ''
	for await (const chunk of request) text += chunk
	if (!text) return {}
	try {
		return JSON.parse(text)
	} catch {
		return {}
	}
}

async function buildPreview(configEditor) {
	const bundles = await readBundles()
	const installed = new Set(bundles.map((bundle) => bundle.name))
	const { items: tuning, stripped } = configEditor ? tuningFrom(configEditor, bundles) : { items: [], stripped: [] }
	const bundleItems = bundles.map((bundle) => inspect({
		id: `bundle:${bundle.name}`,
		kind: 'bundle',
		name: bundle.name,
		version: bundle.version,
		note: bundle.description,
		about: BUNDLE_ABOUT[bundle.name] ?? bundle.description,
		effect: bundle.name,
		spec: bundle.spec,
		local: bundle.local === true,
	}, configEditor, installed))
	const tuned = configEditor ? tuning.map((item) => inspect(item, configEditor, installed)) : []
	const sensitive = [...new Set(stripped)]
	return {
		items: [...bundleItems, ...tuned],
		counts: { bundles: bundleItems.length, tuning: tuned.length, stripped: sensitive.length },
		stripped: sensitive,
	}
}

function registerRoutes(ctx) {
	const webServer = ctx.get('webServer')
	if (!webServer || typeof webServer.register !== 'function') return
	const configEditor = () => ctx.get('configEditor')

	const disposers = [
		webServer.register({
			kind: 'prefix',
			path: API,
			handler: async (request, response) => {
				const url = new URL(request.url ?? '/', 'http://localhost')
				const method = (request.method ?? 'GET').toUpperCase()
				try {
					if (url.pathname === `${API}/preview`) {
						return send(response, 200, { ok: true, ...(await buildPreview(configEditor())) })
					}
					if (method !== 'POST') return send(response, 405, { ok: false, error: 'method not allowed' })

					if (url.pathname === `${API}/encode`) {
						const body = await readJson(request)
						const preview = await buildPreview(configEditor())
						const payload = {
							v: 1,
							createdAt: new Date().toISOString(),
							meta: { title: String(body.title ?? '').slice(0, 40) || undefined },
							items: preview.items.map(({ id, kind, name, version, note, effect, about, patchId, patch, local }) => ({
								id, kind, name, version, note, effect, about, patchId, patch, local: local === true ? true : undefined,
							})),
						}
						const code = encodePayload(payload)
						return send(response, 200, { ok: true, code, bytes: Buffer.byteLength(code), stripped: preview.stripped })
					}

					if (url.pathname === `${API}/decode`) {
						const body = await readJson(request)
						const payload = decodePayload(body.code)
						const editor = configEditor()
						const bundles = new Set((await readBundles()).map((bundle) => bundle.name))
						const items = payload.items.map((item) => inspect(item, editor, bundles))
						return send(response, 200, {
							ok: true,
							meta: payload.meta ?? {},
							counts: {
								bundles: items.filter((item) => item.kind === 'bundle').length,
								tuning: items.filter((item) => item.kind === 'config').length,
							},
							items,
						})
					}

					if (url.pathname === `${API}/apply`) {
						const body = await readJson(request)
						const payload = decodePayload(body.code)
						const wanted = new Set(Array.isArray(body.ids) ? body.ids : [])
						const editor = configEditor()
						const applied = []
						const failed = []
						if (!editor) return send(response, 200, { ok: false, error: 'configEditor 不可用', applied, failed })
						for (const item of payload.items) {
							if (item.kind !== 'config' || !wanted.has(item.id)) continue
							const row = editor.configuration().find((candidate) => bareId(candidate.entry?.patchId ?? candidate.entry?.id) === item.patchId)
							if (!row) {
								failed.push({ id: item.id, error: '这条配置不属于当前 profile' })
								continue
							}
							try {
								await editor.edit(row.entry, (current) => {
									const next = structuredClone(current ?? {})
									for (const [path, value] of Object.entries(item.patch ?? {})) put(next, path, value)
									return next
								})
								applied.push(item.id)
							} catch (cause) {
								failed.push({ id: item.id, error: String(cause?.message ?? cause) })
							}
						}
						return send(response, 200, { ok: true, applied, failed })
					}

					if (url.pathname === `${API}/install`) {
						const body = await readJson(request)
						const manager = ctx.get('pluginManager')
						if (!manager || typeof manager.installBundle !== 'function') {
							return send(response, 200, { ok: false, error: 'pluginManager 不可用', results: [] })
						}
						const wanted = Array.isArray(body.items) ? body.items.slice(0, 24) : []
						const results = []
						for (const entry of wanted) {
							const name = String(entry?.name ?? '').trim()
							if (!SAFE_NAME.test(name)) {
								results.push({ name, ok: false, error: '包名不合法' })
								continue
							}
							if (name === SELF) {
								results.push({ name, ok: false, error: '不能在这里安装配置码插件本身' })
								continue
							}
							const version = typeof entry?.version === 'string' ? entry.version.trim() : ''
							const spec = /^\d+\.\d+\.\d+/.test(version) ? `${name}@${version}` : name
							try {
								const change = await manager.installBundle(spec, { enabled: true, saveExact: true })
								const application = change?.application ?? 'failed'
								const ok = application !== 'failed' && application !== 'cancelled'
								results.push({
									name,
									spec,
									ok,
									application,
									warnings: Array.isArray(change?.warnings) ? change.warnings.slice(0, 3) : undefined,
									error: ok ? undefined : [change?.error?.code, change?.error?.diagnostic].filter(Boolean).join(': ') || 'pnpm 安装失败',
								})
							} catch (cause) {
								results.push({ name, spec, ok: false, error: String(cause?.message ?? cause) })
							}
						}
						return send(response, 200, { ok: true, results })
					}

					if (url.pathname === `${API}/remove`) {
						const body = await readJson(request)
						const manager = ctx.get('pluginManager')
						if (!manager || typeof manager.removeBundle !== 'function') {
							return send(response, 200, { ok: false, error: 'pluginManager 不可用', results: [] })
						}
						const names = Array.isArray(body.names) ? body.names.slice(0, 24) : []
						const results = []
						for (const raw of names) {
							const name = String(raw ?? '').trim()
							if (!SAFE_NAME.test(name)) {
								results.push({ name, ok: false, error: '包名不合法' })
								continue
							}
							if (name === SELF) {
								results.push({ name, ok: false, error: '不能卸载正在显示这个页面的插件' })
								continue
							}
							if (name.startsWith('@deepseek-ai/')) {
								results.push({ name, ok: false, error: '官方核心包不允许在这里卸载' })
								continue
							}
							try {
								const change = await manager.removeBundle(name)
								const application = change?.application ?? 'failed'
								const ok = application !== 'failed' && application !== 'cancelled'
								results.push({
									name,
									ok,
									application,
									error: ok ? undefined : [change?.error?.code, change?.error?.diagnostic].filter(Boolean).join(': ') || 'pnpm 卸载失败',
								})
							} catch (cause) {
								results.push({ name, ok: false, error: String(cause?.message ?? cause) })
							}
						}
						return send(response, 200, { ok: true, results })
					}

					if (url.pathname === `${API}/revert`) {
						const body = await readJson(request)
						const payload = decodePayload(body.code)
						const wanted = new Set(Array.isArray(body.ids) ? body.ids : [])
						const editor = configEditor()
						const reverted = []
						const skipped = []
						const failed = []
						if (!editor) return send(response, 200, { ok: false, error: 'configEditor 不可用', reverted, skipped, failed })
						for (const item of payload.items) {
							if (item.kind !== 'config' || !wanted.has(item.id)) continue
							const row = editor.configuration().find((candidate) => bareId(candidate.entry?.patchId ?? candidate.entry?.id) === item.patchId)
							if (!row) {
								failed.push({ id: item.id, error: '这条配置不属于当前 profile' })
								continue
							}
							try {
								let touched = 0
								await editor.edit(row.entry, (current, inherited) => {
									const next = structuredClone(current ?? {})
									const base = leaves(inherited ?? {})
									const local = leaves(current ?? {})
									for (const [path, value] of Object.entries(item.patch ?? {})) {
										// Only undo what this code actually set; never clobber a value the person owns.
										if (JSON.stringify(local[path]) !== JSON.stringify(value)) continue
										touched += 1
										if (path in base) put(next, path, base[path])
										else drop(next, path)
									}
									return next
								})
								if (touched > 0) reverted.push(item.id)
								else skipped.push(item.id)
							} catch (cause) {
								failed.push({ id: item.id, error: String(cause?.message ?? cause) })
							}
						}
						return send(response, 200, { ok: true, reverted, skipped, failed })
					}

					return send(response, 404, { ok: false, error: 'not found' })
				} catch (cause) {
					return send(response, 400, { ok: false, error: String(cause?.message ?? cause) })
				}
			},
		}),
	]

	return disposers
}

export const name = SELF

export function apply(ctx) {
	ctx.effect(() => {
		const dispose = registerRoutes(ctx)
		return () => {
			for (const disposeRoute of dispose ?? []) {
				try {
					disposeRoute()
				} catch {
					// route owner already gone
				}
			}
		}
	}, 'loadout: routes')
}
