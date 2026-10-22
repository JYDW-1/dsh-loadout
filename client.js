window.__ModuleLoader__.load({
	id: 'dsh-loadout',
	factory: (require) => {
		const React = require('react')
		const h = React.createElement

		const copy = {
			'zh-CN': {
				tab: '配置码',
				title: '配置码',
				subtitle: '把本机的插件与调校打包成一段文本发给别人；也可以粘贴别人的清单，挑着装。',
				genEyebrow: '01 · 生成',
				genTitle: '我的配置码',
				genEmpty: '这台 DSH 还没有可打包的个人化改动。',
				genButton: '生成配置码',
				copyButton: '复制',
				copied: '已复制',
				verify: '在导入框里验证',
				safeHint: '密钥、接口地址与绝对路径不进码',
				stripped: (n) => `已排除 ${n} 个敏感字段`,
				length: (n) => `${n} 个字符`,
				impEyebrow: '02 · 导入',
				impTitle: '粘贴别人的配置码',
				impPlaceholder: 'LOAD1.…',
				parseButton: '解析',
				parseHint: '解析不会改动任何设置',
				applyButton: (n) => `应用选中的 ${n} 项`,
				applied: (n) => `已应用 ${n} 项`,
				failed: (n) => `${n} 项未写入`,
				same: '已一致',
				fresh: '会改动',
				tuneChip: '调校',
				installed: '已安装',
				missing: '未安装',
				installHint: '插件可以一键安装，也可以去 设置 → 插件 里装',
				pickHint: '默认只勾选调校项',
				installButton: (n) => `安装 ${n} 个插件`,
				removeButton: (n) => `卸载 ${n} 个插件`,
				revertButton: (n) => `还原 ${n} 项调校`,
				installing: '正在安装…要下载依赖，可能需要几十秒',
				removing: '正在卸载…',
				reverting: '正在还原…',
				confirmInstall: '再点一次，开始安装',
				confirmRemove: '再点一次，确认卸载',
				confirmRevert: '再点一次，确认还原',
				installDone: (n) => `已安装 ${n} 个插件`,
				installFailed: (n) => `${n} 个插件安装失败`,
				removeDone: (n) => `已卸载 ${n} 个插件`,
				revertDone: (n) => `已还原 ${n} 项调校`,
				restartHint: '部分插件要重启 DSH 才生效',
				notPortable: '作者本机的自研插件，无法自动安装',
				pluginCount: (n) => `${n} 个插件`,
				tuneCount: (n) => `${n} 项调校`,
				from: '来自',
				local: '本地',
			},
			en: {
				tab: 'Loadout code',
				title: 'Loadout code',
				subtitle: 'Pack your plugins and tuning into one line, or paste someone else’s list and pick what to take.',
				genEyebrow: '01 · Export',
				genTitle: 'My loadout code',
				genEmpty: 'Nothing personalised to pack on this install yet.',
				genButton: 'Generate code',
				copyButton: 'Copy',
				copied: 'Copied',
				verify: 'Test in the import box',
				safeHint: 'Keys, endpoints and absolute paths never enter the code',
				stripped: (n) => `${n} sensitive fields excluded`,
				length: (n) => `${n} characters`,
				impEyebrow: '02 · Import',
				impTitle: 'Paste a loadout code',
				impPlaceholder: 'LOAD1.…',
				parseButton: 'Parse',
				parseHint: 'Parsing changes nothing',
				applyButton: (n) => `Apply ${n} selected`,
				applied: (n) => `${n} applied`,
				failed: (n) => `${n} skipped`,
				same: 'unchanged',
				fresh: 'will change',
				tuneChip: 'tuning',
				installed: 'installed',
				missing: 'not installed',
				installHint: 'Plugins install in one click, or from Settings → Plugins',
				pickHint: 'Tuning items are preselected',
				installButton: (n) => `Install ${n} plugin${n === 1 ? '' : 's'}`,
				removeButton: (n) => `Uninstall ${n} plugin${n === 1 ? '' : 's'}`,
				revertButton: (n) => `Revert ${n} tuning item${n === 1 ? '' : 's'}`,
				installing: 'Installing… dependencies may take a while',
				removing: 'Uninstalling…',
				reverting: 'Reverting…',
				confirmInstall: 'Click again to start installing',
				confirmRemove: 'Click again to confirm uninstalling',
				confirmRevert: 'Click again to confirm reverting',
				installDone: (n) => `${n} plugin${n === 1 ? '' : 's'} installed`,
				installFailed: (n) => `${n} install${n === 1 ? '' : 's'} failed`,
				removeDone: (n) => `${n} plugin${n === 1 ? '' : 's'} removed`,
				revertDone: (n) => `${n} tuning item${n === 1 ? '' : 's'} reverted`,
				restartHint: 'Some plugins apply after a DSH restart',
				notPortable: 'A local add-on from the author’s machine, cannot be installed here',
				pluginCount: (n) => `${n} plugins`,
				tuneCount: (n) => `${n} tuning`,
				from: 'from',
				local: 'local',
			},
		}

		function text() {
			const primary = String(navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase()
			return primary === 'zh-cn' || primary.startsWith('zh-hans') ? copy['zh-CN'] : copy.en
		}

		async function api(path, body) {
			const response = await fetch(`/loadout/api${path}`, body
				? {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'same-origin',
					body: JSON.stringify(body),
				}
				: { credentials: 'same-origin' })
			let data
			try {
				data = await response.json()
			} catch {
				return { ok: false, error: `HTTP ${response.status}` }
			}
			return data && typeof data === 'object' ? data : { ok: false, error: 'bad response' }
		}

		const styles = `
.lo-page{display:flex;flex-direction:column;gap:14px;max-width:760px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased}
.lo-eyebrow{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);opacity:.72;font-weight:600}
.lo-head{display:flex;flex-direction:column;gap:5px;padding:0 2px}
.lo-head h2{margin:0;font-size:19px;font-weight:600;letter-spacing:-.01em}
.lo-head p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;max-width:580px}
.lo-card{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-2);padding:15px 15px 13px;display:flex;flex-direction:column;gap:11px}
.lo-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.lo-card-head h3{margin:3px 0 0;font-size:14.5px;font-weight:600}
.lo-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;padding-top:16px;font-variant-numeric:tabular-nums}
.lo-rows{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.lo-row{display:flex;align-items:center;gap:10px;padding:7px 11px;border-top:1px solid var(--dsw-alias-border-l1)}
.lo-row:first-child{border-top:none}
.lo-row-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}
.lo-row-title{font-size:12.5px;font-weight:500}
.lo-row-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.55;overflow-wrap:anywhere}
.lo-row-raw{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
.lo-chip{flex:none;font-size:10.5px;padding:1px 7px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.lo-chip.ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.lo-chip.warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.lo-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.lo-btn{height:30px;padding:0 13px;border-radius:8px;font-size:12.5px;font-weight:500;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background .15s,opacity .15s}
.lo-btn:hover{background:var(--dsw-alias-bg-overlay)}
.lo-btn.primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}
.lo-btn.primary:hover{opacity:.88}
.lo-btn:disabled{opacity:.45;cursor:not-allowed}
.lo-btn:disabled:hover{background:transparent}
.lo-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.lo-code,.lo-input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:9px 11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.55;resize:vertical}
.lo-code{min-height:80px}
.lo-input{min-height:70px}
.lo-code:focus,.lo-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.lo-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);padding:7px 10px;border-radius:8px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1)}
.lo-note.err{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.lo-check{accent-color:var(--dsw-alias-brand-primary);width:14px;height:14px;margin:0;cursor:pointer;flex:none}
.lo-label{display:flex;align-items:center;gap:10px;padding:7px 11px;border-top:1px solid var(--dsw-alias-border-l1);cursor:pointer}
.lo-label:first-child{border-top:none}
`

		function itemLine(t, item) {
			if (item.kind === 'bundle') return [item.name, item.version].filter(Boolean).join(' · ')
			if (item.rows) {
				return item.rows
					.map((row) => `${row.path} = ${JSON.stringify(row.value)}${row.same ? '' : ` (${t.local}: ${JSON.stringify(row.local ?? null)})`}`)
					.join(' · ')
			}
			return item.note ?? ''
		}

		function itemBody(t, item) {
			const title = item.effect ?? item.name ?? item.id
			const raw = item.kind === 'bundle' ? (item.version ? `v${item.version}` : '') : itemLine(t, item)
			const about = typeof item.about === 'string' ? item.about.trim() : ''
			const lines = [h('div', { className: 'lo-row-title' }, title)]
			if (about) lines.push(h('div', { className: 'lo-row-note' }, about))
			if (item.kind === 'bundle' && item.local) lines.push(h('div', { className: 'lo-row-note' }, t.notPortable))
			if (raw) lines.push(h('div', { className: about && item.kind === 'config' ? 'lo-row-raw' : 'lo-row-note' }, raw))
			return h('div', { className: 'lo-row-main' }, lines)
		}

		function chip(t, item) {
			if (item.kind === 'bundle') {
				return h('span', { className: `lo-chip ${item.installed ? 'ok' : 'warn'}` },
					item.installed ? t.installed : t.missing)
			}
			return h('span', { className: `lo-chip ${item.status === 'same' ? 'ok' : ''}` },
				item.status === 'same' ? t.same : t.fresh)
		}

		function Panel() {
			const t = text()
			const [preview, setPreview] = React.useState(null)
			const [code, setCode] = React.useState('')
			const [stripped, setStripped] = React.useState(0)
			const [draft, setDraft] = React.useState('')
			const [parsed, setParsed] = React.useState(null)
			const [picked, setPicked] = React.useState({})
			const [busy, setBusy] = React.useState(false)
			const [error, setError] = React.useState('')
			const [result, setResult] = React.useState('')
			const [confirm, setConfirm] = React.useState('')

			React.useEffect(() => {
				let alive = true
				api('/preview').then((data) => {
					if (!alive) return
					if (data.ok) setPreview(data)
					else setError(data.error ?? '')
				}).catch((cause) => { if (alive) setError(String(cause?.message ?? cause)) })
				return () => { alive = false }
			}, [])

			async function generate() {
				setBusy(true); setError(''); setResult('')
				try {
					const data = await api('/encode', { title: t.title })
					if (data.ok) { setCode(data.code); setStripped(data.stripped?.length ?? 0) }
					else setError(data.error ?? '')
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			async function parse(source) {
				const code = typeof source === 'string' ? source : draft
				if (code !== draft) setDraft(code)
				setBusy(true); setError(''); setResult('')
				try {
					const data = await api('/decode', { code })
					if (data.ok) {
						setParsed(data)
						setPicked(Object.fromEntries(data.items.map((item) => [item.id, item.kind === 'config'])))
					} else { setParsed(null); setError(data.error ?? '') }
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			async function applyPicked() {
				const ids = chosenTuning.map((item) => item.id)
				if (ids.length === 0) return
				setBusy(true); setError(''); setResult('')
				try {
					const data = await api('/apply', { code: draft, ids })
					if (!data.ok) { setError(data.error ?? ''); return }
					const applied = data.applied?.length ?? 0
					const failed = data.failed?.length ?? 0
					setResult(failed > 0 ? `${t.applied(applied)} · ${t.failed(failed)}` : t.applied(applied))
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			async function copyCode() {
				try { await navigator.clipboard.writeText(code); setResult(t.copied) } catch { setResult('') }
			}

			/** Re-read the parsed list so "installed" chips follow what just happened. */
			async function refresh(source) {
				const data = await api('/decode', { code: source })
				if (!data.ok) return
				setParsed(data)
				setPicked(Object.fromEntries(data.items.map((item) => [item.id, item.kind === 'config'])))
			}

			const parsedItems = parsed?.items ?? []
			const chosen = parsedItems.filter((item) => picked[item.id])
			const chosenMissing = chosen.filter((item) => item.kind === 'bundle' && !item.installed)
			const chosenPresent = chosen.filter((item) => item.kind === 'bundle' && item.installed)
			const chosenTuning = chosen.filter((item) => item.kind === 'config')

			/** Destructive actions need the same button pressed twice. */
			async function installChosen() {
				if (chosenMissing.length === 0) return
				if (confirm !== 'install') { setConfirm('install'); setResult(t.confirmInstall); return }
				setConfirm(''); setBusy(true); setError(''); setResult(t.installing)
				try {
					const data = await api('/install', { items: chosenMissing.map((item) => ({ name: item.name, version: item.version })) })
					const results = Array.isArray(data.results) ? data.results : []
					if (results.length === 0) { setError(data.error ?? ''); return }
					const done = results.filter((row) => row.ok)
					const bad = results.filter((row) => !row.ok)
					const parts = []
					if (done.length > 0) parts.push(t.installDone(done.length))
					if (bad.length > 0) parts.push(`${t.installFailed(bad.length)}（${bad.slice(0, 2).map((row) => `${row.name}: ${row.error}`).join('；')}）`)
					if (results.some((row) => row.application === 'restart-required')) parts.push(t.restartHint)
					setResult(parts.join(' · '))
					await refresh(draft)
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			async function removeChosen() {
				if (chosenPresent.length === 0) return
				if (confirm !== 'remove') { setConfirm('remove'); setResult(t.confirmRemove); return }
				setConfirm(''); setBusy(true); setError(''); setResult(t.removing)
				try {
					const data = await api('/remove', { names: chosenPresent.map((item) => item.name) })
					const results = Array.isArray(data.results) ? data.results : []
					if (results.length === 0) { setError(data.error ?? ''); return }
					const done = results.filter((row) => row.ok)
					const bad = results.filter((row) => !row.ok)
					const parts = []
					if (done.length > 0) parts.push(t.removeDone(done.length))
					if (bad.length > 0) parts.push(`${t.installFailed(bad.length)}（${bad.slice(0, 2).map((row) => `${row.name}: ${row.error}`).join('；')}）`)
					if (results.some((row) => row.application === 'restart-required')) parts.push(t.restartHint)
					setResult(parts.join(' · '))
					await refresh(draft)
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			async function revertChosen() {
				if (chosenTuning.length === 0) return
				if (confirm !== 'revert') { setConfirm('revert'); setResult(t.confirmRevert); return }
				setConfirm(''); setBusy(true); setError(''); setResult(t.reverting)
				try {
					const data = await api('/revert', { code: draft, ids: chosenTuning.map((item) => item.id) })
					if (!data.ok) { setError(data.error ?? ''); return }
					const reverted = data.reverted?.length ?? 0
					const failed = data.failed?.length ?? 0
					setResult(failed > 0 ? `${t.revertDone(reverted)} · ${t.failed(failed)}` : t.revertDone(reverted))
					await refresh(draft)
				} catch (cause) { setError(String(cause?.message ?? cause)) } finally { setBusy(false) }
			}

			const counts = preview?.counts
			const items = preview?.items ?? []

			return h('div', { className: 'lo-page' },
				h('style', null, styles),
				h('header', { className: 'lo-head' },
					h('div', { className: 'lo-eyebrow' }, 'LOADOUT'),
					h('h2', null, t.title),
					h('p', null, t.subtitle)),

				h('section', { className: 'lo-card' },
					h('div', { className: 'lo-card-head' },
						h('div', null,
							h('div', { className: 'lo-eyebrow' }, t.genEyebrow),
							h('h3', null, t.genTitle)),
						counts ? h('span', { className: 'lo-meta' },
							`${t.pluginCount(counts.bundles)} · ${t.tuneCount(counts.tuning)}`) : null),
					items.length > 0
						? h('div', { className: 'lo-rows' }, items.slice(0, 24).map((item) => h('div', { className: 'lo-row', key: item.id },
							itemBody(t, item),
							h('span', { className: `lo-chip ${item.kind === 'config' ? '' : item.installed ? 'ok' : 'warn'}` },
								item.kind === 'config' ? t.tuneChip : item.installed ? t.installed : t.missing))))
						: h('div', { className: 'lo-note' }, t.genEmpty),
					h('div', { className: 'lo-actions' },
						h('button', { className: 'lo-btn primary', onClick: generate, disabled: busy || items.length === 0 }, t.genButton),
						code ? h('button', { className: 'lo-btn', onClick: () => parse(code), disabled: busy }, t.verify) : null,
						code ? h('button', { className: 'lo-btn', onClick: copyCode }, t.copyButton) : null,
						h('span', { className: 'lo-hint' }, stripped > 0 ? t.stripped(stripped) : t.safeHint),
						code ? h('span', { className: 'lo-hint' }, t.length(code.length)) : null),
					code ? h('textarea', { className: 'lo-code', readOnly: true, value: code, onFocus: (event) => event.target.select() }) : null),

				h('section', { className: 'lo-card' },
					h('div', { className: 'lo-card-head' },
						h('div', null,
							h('div', { className: 'lo-eyebrow' }, t.impEyebrow),
							h('h3', null, t.impTitle))),
					h('textarea', {
						className: 'lo-input',
						placeholder: t.impPlaceholder,
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						spellCheck: false,
					}),
					h('div', { className: 'lo-actions' },
						h('button', { className: 'lo-btn primary', onClick: parse, disabled: busy || draft.trim().length === 0 }, t.parseButton),
						h('span', { className: 'lo-hint' }, t.parseHint)),

					parsed
						? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '9px' } },
							h('div', { className: 'lo-note' },
								`${parsed.meta?.title || t.title}${parsed.meta?.author ? ` · ${t.from} ${parsed.meta.author}` : ''} · ${t.pluginCount(parsed.counts.bundles)} · ${t.tuneCount(parsed.counts.tuning)}`),
							h('div', { className: 'lo-rows' }, parsed.items.map((item) => h('label', { className: 'lo-label', key: item.id },
								h('input', {
									className: 'lo-check',
									type: 'checkbox',
									checked: Boolean(picked[item.id]),
									onChange: () => {
										setConfirm('')
										setPicked((current) => ({ ...current, [item.id]: !current[item.id] }))
									},
								}),
								itemBody(t, item),
								chip(t, item)))),
							h('div', { className: 'lo-actions' },
								h('button', { className: 'lo-btn primary', onClick: applyPicked, disabled: busy || chosenTuning.length === 0 }, t.applyButton(chosenTuning.length)),
								chosenMissing.length > 0
									? h('button', { className: 'lo-btn', onClick: installChosen, disabled: busy }, confirm === 'install' ? t.confirmInstall : t.installButton(chosenMissing.length))
									: null,
								chosenPresent.length > 0
									? h('button', { className: 'lo-btn', onClick: removeChosen, disabled: busy }, confirm === 'remove' ? t.confirmRemove : t.removeButton(chosenPresent.length))
									: null,
								chosenTuning.length > 0
									? h('button', { className: 'lo-btn', onClick: revertChosen, disabled: busy }, confirm === 'revert' ? t.confirmRevert : t.revertButton(chosenTuning.length))
									: null,
								h('span', { className: 'lo-hint' }, t.pickHint)))
						: null),

				error ? h('div', { className: 'lo-note err' }, error) : null,
				result ? h('div', { className: 'lo-note' }, result) : null)
		}

		const inject = ['slots']

		function apply(ctx) {
			if (!ctx.slots || typeof ctx.slots.inject !== 'function') return
			ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
				name: 'settings.section',
				id: 'loadout',
				order: 30,
				// A thunk is re-read on every projection, so the nav label follows the active locale.
				label: () => text().tab,
			}, Panel)), 'loadout 配置码 page')
		}

		const module = { exports: {} }
		module.exports.apply = apply
		module.exports.inject = inject
		return module.exports
	},
})
