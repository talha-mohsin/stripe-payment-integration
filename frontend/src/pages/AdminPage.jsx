import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  imageUrl: "",
  unitAmount: "",
  currency: "usd",
  active: true,
};

function formatMoney(amount = 0, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency).toUpperCase(),
    }).format(Number(amount || 0) / 100);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [customersError, setCustomersError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const productDialogRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      setDashboard(await apiRequest("/api/admin/dashboard"));
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const data = await apiRequest("/api/admin/products");
      setProducts(data.products || []);
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError("");
    try {
      const data = await apiRequest("/api/admin/customers");
      setCustomers(data.customers || []);
    } catch (error) {
      setCustomersError(error.message);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadProducts();
    loadCustomers();
  }, [loadDashboard, loadProducts, loadCustomers]);

  useEffect(() => {
    const dialog = productDialogRef.current;
    if (!dialog) return;

    if (productModalOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("input")?.focus();
    } else if (!productModalOpen && dialog.open) {
      dialog.close();
    }
  }, [productModalOpen]);

  function editProduct(product) {
    setEditingId(product.id || product._id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      unitAmount: product.unitAmount ?? "",
      currency: (product.currency || "usd").toLowerCase(),
      active: product.active !== false,
    });
    setFormError("");
    setProductModalOpen(true);
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
    setFormError("");
    setProductModalOpen(false);
  }

  function startNewProduct() {
    setEditingId("");
    setForm(EMPTY_FORM);
    setFormError("");
    setProductModalOpen(true);
  }

  async function submitProduct(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      unitAmount: Number(form.unitAmount),
      currency: form.currency.trim().toLowerCase(),
    };
    try {
      await apiRequest(
        editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : "/api/admin/products",
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      resetForm();
      await Promise.all([loadProducts(), loadDashboard()]);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(product) {
    const id = product.id || product._id;
    if (!window.confirm(`Deactivate “${product.name}”? It will no longer be available in the store.`)) return;
    setBusyProductId(id);
    setProductsError("");
    try {
      await apiRequest(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadProducts();
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setBusyProductId("");
    }
  }

  const stats = dashboard?.stats;
  const recentOrders = dashboard?.recentOrders || [];

  const activeTabDetails = {
    overview: {
      eyebrow: "Store management",
      title: "Dashboard",
      description: "Monitor sales and keep an eye on store performance.",
    },
    customers: {
      eyebrow: "Customer activity",
      title: "Customers",
      description: "Understand who is buying and what they spend.",
    },
    products: {
      eyebrow: "Catalog",
      title: "Products",
      description: "Manage the products available in your storefront.",
    },
  }[activeTab];

  function renderRecentOrders() {
    return (
      <section className="admin-section" aria-labelledby="recent-orders-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Latest activity</p><h2 id="recent-orders-heading">Recent sales</h2></div>
        </div>
        {dashboardError && <div className="error-box" role="alert">Could not load recent sales: {dashboardError}</div>}
        {dashboardLoading ? (
          <div className="admin-loading">Loading recent sales…</div>
        ) : dashboardError ? (
          <button className="secondary-button" type="button" onClick={loadDashboard}>Try again</button>
        ) : recentOrders.length === 0 ? (
          <div className="admin-empty">No orders to show yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td data-label="Customer">{order.customerEmail || "Guest"}</td>
                    <td data-label="Amount">{formatMoney(order.amountTotal, order.currency)}</td>
                    <td data-label="Status"><span className={`status-pill status-${String(order.status || "unknown").toLowerCase()}`}>{order.status || "Unknown"}</span></td>
                    <td data-label="Date">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderCustomers() {
    return (
      <section className="admin-section" aria-labelledby="customers-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Customer activity</p><h2 id="customers-heading">Customer records</h2></div>
          <button className="secondary-button" type="button" onClick={loadCustomers}>Refresh</button>
        </div>
        {customersError && <div className="error-box" role="alert">Could not load customer records: {customersError}</div>}
        {customersLoading ? (
          <div className="admin-loading" aria-live="polite">Loading customer records…</div>
        ) : customersError && customers.length === 0 ? (
          <button className="secondary-button" type="button" onClick={loadCustomers}>Try again</button>
        ) : customers.length === 0 ? (
          <div className="admin-empty">No customer records to show yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table customer-table">
              <thead>
                <tr><th>Email</th><th>Paid sales</th><th>Order count</th><th>Lifetime paid</th><th>Last order</th></tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td data-label="Email">{customer.email || "—"}</td>
                    <td data-label="Paid sales">{customer.sales ?? 0}</td>
                    <td data-label="Order count">{customer.orderCount ?? 0}</td>
                    <td data-label="Lifetime paid">{formatMoney(customer.totalPaid, customer.currency)}</td>
                    <td data-label="Last order">{formatDate(customer.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderProducts() {
    return (
      <section className="admin-section products-section" aria-labelledby="products-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Catalog</p><h2 id="products-heading">Product catalog</h2></div>
          <button className="primary-button add-product-button" type="button" onClick={startNewProduct}>
            <Icon name="plus" />
            <span>Add product</span>
          </button>
        </div>
        {productsError && <div className="error-box" role="alert">Could not load or update products: {productsError}</div>}
        {productsLoading ? (
          <div className="admin-loading" aria-live="polite">Loading products…</div>
        ) : productsError && products.length === 0 ? (
          <button className="secondary-button" type="button" onClick={loadProducts}>Try again</button>
        ) : products.length === 0 ? (
          <div className="admin-empty product-empty">
            <span className="empty-icon"><Icon name="products" /></span>
            <strong>Your catalog is empty</strong>
            <span>Add your first product to start selling.</span>
            <button className="primary-button add-product-button" type="button" onClick={startNewProduct}>
              <Icon name="plus" />
              Add your first product
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table product-table">
              <thead><tr><th>Product</th><th>Price</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((product) => {
                  const id = product.id || product._id;
                  return (
                    <tr key={id}>
                      <td data-label="Product">
                        <span className="product-name-cell">
                          <img src={product.imageUrl} alt="" loading="lazy" />
                          <span><strong>{product.name}</strong><small>{product.description}</small></span>
                        </span>
                      </td>
                      <td data-label="Price">{formatMoney(product.unitAmount, product.currency)}</td>
                      <td data-label="Category">{product.category || "—"}</td>
                      <td data-label="Status"><span className={`status-pill ${product.active === false ? "status-inactive" : "status-active"}`}>{product.active === false ? "Inactive" : "Active"}</span></td>
                      <td data-label="Actions" className="row-actions">
                        <button type="button" className="text-button" onClick={() => editProduct(product)}>Edit</button>
                        {product.active !== false && <button type="button" className="text-button danger-text" disabled={busyProductId === id} onClick={() => deactivateProduct(product)}>{busyProductId === id ? "Deactivating…" : "Deactivate"}</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="page-container admin-page">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <p className="admin-sidebar-label">Workspace</p>
          <nav className="admin-sidebar-nav" aria-label="Admin sections">
            <SidebarItem label="Overview" icon="overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            <SidebarItem label="Customers" icon="customers" active={activeTab === "customers"} onClick={() => setActiveTab("customers")} />
            <SidebarItem label="Products" icon="products" active={activeTab === "products"} onClick={() => setActiveTab("products")} />
          </nav>
          <div className="admin-sidebar-footer">
            <span className="sidebar-secure-icon"><Icon name="shield" /></span>
            <span><strong>Admin workspace</strong><small>Store management</small></span>
          </div>
        </aside>

        <div className="admin-content">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">{activeTabDetails.eyebrow}</p>
              <h1>{activeTabDetails.title}</h1>
              <p>{activeTabDetails.description}</p>
            </div>
            <button className="secondary-button refresh-button" type="button" onClick={() => {
              if (activeTab === "overview") loadDashboard();
              if (activeTab === "customers") loadCustomers();
              if (activeTab === "products") loadProducts();
            }}>
              <Icon name="refresh" />
              Refresh
            </button>
          </div>

          {activeTab === "overview" && (
            <>
              <section className="admin-section" aria-labelledby="overview-heading">
                <div className="section-heading">
                  <div><p className="eyebrow">At a glance</p><h2 id="overview-heading">Store overview</h2></div>
                </div>
                {dashboardError && <div className="error-box" role="alert">Could not load dashboard data: {dashboardError}</div>}
                {dashboardLoading ? (
                  <div className="admin-loading" aria-live="polite">Loading store metrics…</div>
                ) : dashboardError ? (
                  <button className="secondary-button" type="button" onClick={loadDashboard}>Try again</button>
                ) : (
                  <div className="metrics-grid">
                    <Metric label="Revenue" value={formatMoney(stats?.revenue)} accent="Revenue earned" />
                    <Metric label="Sales" value={stats?.sales ?? 0} accent="Orders completed" />
                    <Metric label="Customers" value={stats?.customers ?? 0} accent="Store customers" />
                    <Metric label="Pending orders" value={stats?.pendingOrders ?? 0} accent="Awaiting payment" />
                  </div>
                )}
              </section>
              {renderRecentOrders()}
            </>
          )}
          {activeTab === "customers" && renderCustomers()}
          {activeTab === "products" && renderProducts()}
        </div>
      </div>

      <dialog
        ref={productDialogRef}
        className="product-dialog"
        aria-labelledby="product-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!saving) resetForm();
        }}
        onClick={(event) => {
          if (event.target === productDialogRef.current && !saving) resetForm();
        }}
        onClose={() => {
          if (productModalOpen) setProductModalOpen(false);
        }}
      >
        <form className="product-form" onSubmit={submitProduct}>
          <div className="modal-heading">
            <div>
              <p className="eyebrow">{editingId ? "Update catalog" : "Catalog"}</p>
              <h2 id="product-dialog-title">{editingId ? "Edit product" : "Add a product"}</h2>
              <p>Give your product a clear name, price, and image.</p>
            </div>
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close product form"
              onClick={resetForm}
              disabled={saving}
            >
              <Icon name="close" />
            </button>
          </div>
          {formError && <div className="error-box" role="alert">{formError}</div>}
          <div className="product-form-grid">
            <label>Product name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} autoFocus /></label>
            <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={80} /></label>
            <label className="form-wide">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" required maxLength={1000} /></label>
            <label className="form-wide">Image URL<input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" required /></label>
            {form.imageUrl && (
              <div className="form-wide image-preview">
                <img src={form.imageUrl} alt="Product preview" onError={(event) => { event.currentTarget.hidden = true; }} onLoad={(event) => { event.currentTarget.hidden = false; }} />
                <span>Image preview</span>
              </div>
            )}
            <label>Price in cents<input type="number" min="1" max="100000000" step="1" value={form.unitAmount} onChange={(e) => setForm({ ...form, unitAmount: e.target.value })} required /><span className="field-hint">For example, 1999 = $19.99</span></label>
            <label>Currency<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} required minLength="3" maxLength="3" /></label>
            <label className="checkbox-field"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active in storefront</label>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>Cancel</button>
            <button className="primary-button form-submit" type="submit" disabled={saving}>
              <Icon name="check" />
              {saving ? "Saving…" : editingId ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

function Metric({ label, value, accent }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{accent}</small>
    </article>
  );
}

function SidebarItem({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      className={`sidebar-item${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {active && <span className="sidebar-active-mark" aria-hidden="true" />}
    </button>
  );
}

function Icon({ name }) {
  const paths = {
    overview: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
    customers: <><path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0111.7-2L20 12M4 12l2.7 5a7 7 0 0011.7-2" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };

  return (
    <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name] || paths.overview}
    </svg>
  );
}
