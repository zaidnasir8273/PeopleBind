import { StageFlow } from './StageFlow'

const STAGES = [
  { label: 'Employee' },
  { label: 'Leave request', status: 'Pending' },
  { label: 'Manager', status: 'Reviewing' },
  { label: 'Approved', status: 'Approved' },
]

export function LeaveApprovalFlow({ className }) {
  return <StageFlow className={className} stages={STAGES} />
}
