export function GridPagination({ page, pageSize, total, onPage, onPageSize }: {
  page: number; pageSize: number; total: number;
  onPage: (page: number) => void; onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="crease-pagination">
    <label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>
      {[10, 20, 30, 40, 50].map(size => <option key={size} value={size}>{size}</option>)}
    </select></label>
    <span aria-live="polite">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : "0 results"}</span>
    <div className="crease-pagination-buttons">
      <button onClick={() => onPage(1)} disabled={page <= 1} aria-label="First page">First</button>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">Previous</button>
      <span>Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">Next</button>
      <button onClick={() => onPage(pages)} disabled={page >= pages} aria-label="Last page">Last</button>
    </div>
  </div>;
}
