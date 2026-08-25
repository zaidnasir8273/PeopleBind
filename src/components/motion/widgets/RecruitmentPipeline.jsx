import { StageFlow } from './StageFlow'

const STAGES = [
  { label: 'Application' },
  { label: 'Interview', status: 'In progress' },
  { label: 'Offer', status: 'Sent' },
  { label: 'Hired', status: 'Hired' },
]

export function RecruitmentPipeline({ className }) {
  return <StageFlow className={className} stages={STAGES} />
}
