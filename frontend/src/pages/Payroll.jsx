export default function Payroll() {
  const runs = [
    {id:'#0246',period:'Mar 1–15, 2026',employees:1231,gross:'$4,612,340',deductions:'-$1,034,220',net:'$3,578,120',status:'approved',label:'Approved'},
    {id:'#0245',period:'Feb 16–28, 2026',employees:1228,gross:'$4,489,150',deductions:'-$1,012,800',net:'$3,476,350',status:'approved',label:'Paid'},
    {id:'#0244',period:'Feb 1–15, 2026',employees:1225,gross:'$4,528,670',deductions:'-$1,021,450',net:'$3,507,220',status:'approved',label:'Paid'},
    {id:'#0243',period:'Jan 16–31, 2026',employees:1220,gross:'$4,395,880',deductions:'-$988,340',net:'$3,407,540',status:'approved',label:'Paid'},
    {id:'#0242',period:'Jan 1–15, 2026',employees:1218,gross:'$4,401,230',deductions:'-$992,100',net:'$3,409,130',status:'approved',label:'Paid'},
  ]

  return (
    <>
      <div className="payroll-grid">
        <div className="kpi-card glass-card"><div className="kpi-label">Monthly Payroll</div><div className="kpi-value" style={{fontSize:24}}>$8.4M</div><div className="kpi-trend up">↑ 4.2% <span className="kpi-sub">vs last quarter</span></div></div>
        <div className="kpi-card glass-card"><div className="kpi-label">Avg Salary</div><div className="kpi-value" style={{fontSize:24}}>$82.5K</div><div className="kpi-trend up">↑ 2.8% <span className="kpi-sub">y-o-y</span></div></div>
        <div className="kpi-card glass-card"><div className="kpi-label">YTD Payroll</div><div className="kpi-value" style={{fontSize:24}}>$75.6M</div><div className="kpi-trend up">↑ 6.1% <span className="kpi-sub">target 93%</span></div></div>
      </div>

      <div className="glass-card" style={{padding:0}}>
        <div className="card-header" style={{padding:'16px 24px 0'}}><h2>Recent Payroll Runs</h2><span className="action">+ New Run</span></div>
        <div className="table-wrap payroll-table-wrap">
          <table>
            <thead><tr><th>Run #</th><th>Period</th><th>Employees</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td className="payroll-amount">{r.id}</td>
                  <td>{r.period}</td>
                  <td>{r.employees.toLocaleString()}</td>
                  <td className="payroll-amount">{r.gross}</td>
                  <td className="payroll-amount">{r.deductions}</td>
                  <td className="payroll-amount">{r.net}</td>
                  <td><span className={`status-pill ${r.status}`}>{r.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
