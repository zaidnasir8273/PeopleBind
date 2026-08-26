import { StageFlow } from './StageFlow'

const STAGES = [
  { label: 'Employee' },
  { label: 'Leave request', status: 'Pending' },
  { label: 'Manager', status: 'Reviewing' },
  { label: 'Approved', status: 'Approved' },
]

export function LeaveApprovalFlow({ className }) {
  return (
    <div className={className}>
      <p className="widget-flow-context">Sarah Ahmed · Annual Leave · Aug 28–30</p>
      <div className="widget-leave-flow">
        <StageFlow stages={STAGES} />
      </div>
    </div>
  )
}
