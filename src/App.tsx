/**
 * JSON 工具：格式化、对比、转 TypeScript，以及 URL 参数的解析与拼接。
 *
 * 四个 tab（JSON 格式化 / JSON 对比 / 转 TypeScript / URL 参数）各自独立，这里只负责外壳：
 * 标题、tab 导航、设置状态，以及把各个工具挂在同一页上。样式按顺序拼接成一段 <style>，
 * 靠后的样式覆盖靠前的。设计说明和历次改动见 docs/DESIGN_NOTES.md。
 */
import { CSS } from './styles';
import { POLISH } from './stylesPolish';
import { FEATURES_CSS } from './stylesFeatures';
import { LAYOUT_CSS } from './stylesLayout';
import { TUNE_CSS } from './stylesTune';
import { CODE_CSS } from './stylesCode';
import { EDIT_CSS } from './stylesEdit';
import { FINAL_CSS } from './stylesFinal';
import { ALIGN_CSS } from './stylesAlign';
import { THEME_CSS } from './stylesTheme';
import { V19_CSS } from './stylesV19';
import { URL_CSS } from './stylesUrl';
import { Toaster } from './components/Toast';
import { FormatTool } from './components/FormatTool';
import { TypeTool } from './components/TypeTool';
import { DiffTool } from './components/DiffTool';
import { UrlTool } from './components/UrlTool';
import { SettingsProvider, usePersisted } from './lib/settings';
import { SettingsMenu, SettingsStatus } from './components/SettingsStatus';

type View = 'format' | 'diff' | 'types' | 'url';

const VIEWS: { id: View; label: string }[] = [
    { id: 'format', label: 'JSON 格式化' },
    { id: 'diff', label: 'JSON 对比' },
    { id: 'types', label: '转 TypeScript' },
    { id: 'url', label: 'URL 参数' },
];
const VIEW_IDS = VIEWS.map((v) => v.id);

function Shell() {
    const [view, setView] = usePersisted<View>('app.view', 'format', VIEW_IDS);
    return (
        <>
            <header className="head">
                <div className="head-left">
                    <h1 className="title">JSON 工具</h1>
                    <SettingsStatus />
                </div>
                <nav className="tool-nav" aria-label="工具">
                    <div
                        className="tabs nav"
                        role="tablist"
                        aria-label="工具"
                        onKeyDown={(event) => {
                            const current = VIEWS.findIndex((item) => item.id === view);
                            const last = VIEWS.length - 1;
                            const next = {
                                ArrowLeft: (current + last) % VIEWS.length,
                                ArrowRight: (current + 1) % VIEWS.length,
                                Home: 0,
                                End: last,
                            }[event.key];
                            if (next === undefined) return;
                            event.preventDefault();
                            const id = VIEWS[next].id;
                            setView(id);
                            document.getElementById(`tool-tab-${id}`)?.focus();
                        }}
                    >
                        {VIEWS.map((v) => (
                            <button
                                key={v.id}
                                type="button"
                                role="tab"
                                id={`tool-tab-${v.id}`}
                                aria-controls={`tool-panel-${v.id}`}
                                tabIndex={view === v.id ? 0 : -1}
                                className="tab"
                                aria-selected={view === v.id}
                                onClick={() => setView(v.id)}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                    <SettingsMenu />
                </nav>
            </header>
            <div className="tool-panel" id="tool-panel-format" role="tabpanel" aria-labelledby="tool-tab-format" hidden={view !== 'format'}>
                <FormatTool />
            </div>
            <div className="tool-panel" id="tool-panel-diff" role="tabpanel" aria-labelledby="tool-tab-diff" hidden={view !== 'diff'}>
                <DiffTool />
            </div>
            <div className="tool-panel" id="tool-panel-types" role="tabpanel" aria-labelledby="tool-tab-types" hidden={view !== 'types'}>
                <TypeTool />
            </div>
            <div className="tool-panel" id="tool-panel-url" role="tabpanel" aria-labelledby="tool-tab-url" hidden={view !== 'url'}>
                <UrlTool />
            </div>
        </>
    );
}

export const App = () => {
    return (
        <div className="app">
            <style>{CSS + POLISH + FEATURES_CSS + LAYOUT_CSS + TUNE_CSS + CODE_CSS + EDIT_CSS + FINAL_CSS + ALIGN_CSS + THEME_CSS + V19_CSS + URL_CSS}</style>
            <SettingsProvider>{(epoch) => <Shell key={epoch} />}</SettingsProvider>
            <Toaster />
        </div>
    );
};

export default App;
