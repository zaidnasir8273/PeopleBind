import { HelpEditor } from '../components/HelpEditor'

export default function PlatformHelp() {
  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Documentation</h1>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        This is PeopleBind's official documentation — visible to every company's users, and used to ground the AI
        support agent's answers. Only published articles are shown to users or used by the AI.
      </p>

      <HelpEditor companyId={null} />
    </div>
  )
}
