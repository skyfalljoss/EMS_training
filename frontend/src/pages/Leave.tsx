import { useState } from 'react'
import type { LeaveBalance, PendingLeave } from '../types/leave'

export default function Leave() {
  // Using empty array to replace deleted mock pendingLeaves
  const [leaves, setLeaves] = useState<PendingLeave[]>([])

  // Hardcoding an empty array to replace deleted mock leaveBalances
  const leaveBalances: LeaveBalance[] = []

  function handleApprove(idx: number) {
    setLeaves(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDecline(idx: number) {
    setLeaves(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="leave-layout">
      <div className="glass-card">
        <div className="card-header"><h2>Leave Balances</h2></div>
        <div className="leave-balances">
          {leaveBalances.map(lb => (
            <div key={lb.type} className="leave-type">
              <div className="type">{lb.type}</div>
              <div className="used">{lb.used} days used of {lb.total}</div>
              <div className="leave-bar"><div className="leave-bar-fill" style={{width:`${(lb.used/lb.total)*100}%`,background:lb.color}}></div></div>
            </div>
          ))}
          {leaveBalances.length === 0 && <div className="empty-state">No balances available</div>}
        </div>
      </div>

      <div>
        <div className="glass-card mb-16">
          <div className="card-header"><h2>Pending Approvals</h2><span className="action">View all</span></div>
          {leaves.length === 0 ? (
            <div className="pending-empty">All caught up!</div>
          ) : (
            leaves.map((l, i) => (
              <div key={i} className="pending-approval">
                <div className="pa-info">
                  <div className="pa-name">{l.name}</div>
                  <div className="pa-detail">{l.dept} · {l.type} · {l.from}</div>
                </div>
                <div className="pa-actions">
                  <button className="pa-btn approve" onClick={() => handleApprove(i)}>Approve</button>
                  <button className="pa-btn decline" onClick={() => handleDecline(i)}>Decline</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="glass-card">
          <div className="card-header"><h2>Team Calendar</h2></div>
          <div className="text-center" style={{padding:'16px 0'}}>
            <div className="empty-state" style={{marginTop: '20px'}}>Calendar not loaded</div>
          </div>
        </div>
      </div>
    </div>
  )
}
