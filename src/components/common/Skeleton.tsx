import { shimmerBox } from '../ui'

export function Skeleton() {
  return (
    <div className="p-[4px]">
      <div className="mb-[18px] grid grid-cols-4 gap-[15px]"><i className={`h-[112px] ${shimmerBox}`} /><i className={`h-[112px] ${shimmerBox}`} /><i className={`h-[112px] ${shimmerBox}`} /><i className={`h-[112px] ${shimmerBox}`} /></div>
      <div className={`mb-[18px] h-[230px] ${shimmerBox}`} />
      <div className={`mb-[18px] h-[230px] ${shimmerBox}`} />
      <div className={`mb-[18px] h-[120px] ${shimmerBox}`} />
    </div>
  )
}
