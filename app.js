// ============================================
// DATA MANAGEMENT
// ============================================

const DB_KEY = "paintShopDB"

function getDB() {
  const data = localStorage.getItem(DB_KEY)
  return data ? JSON.parse(data) : initializeDB()
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function initializeDB() {
  const db = {
    products: [
      { id: "p1", barcode: "123456", name: "White Paint 1L", company: "ABC Paints", stock: 20 },
      { id: "p2", barcode: "123457", name: "Red Paint 2L", company: "XYZ Paints", stock: 3 },
      { id: "p3", barcode: "123458", name: "Blue Paint 1L", company: "ABC Paints", stock: 8 },
    ],
    sales: [{ id: "s1", productId: "p1", qty: 2, date: new Date("2025-10-30T12:30:00Z").toISOString() }],
    procurements: [{ id: "pr1", productId: "p1", qty: 10, date: new Date("2025-10-29T09:45:00Z").toISOString() }],
  }
  saveDB(db)
  return db
}

// ============================================
// UI NAVIGATION
// ============================================

function switchSection(sectionId) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"))
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"))

  document.getElementById(sectionId).classList.add("active")
  event.target.closest(".nav-item").classList.add("active")

  const titles = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    sales: "Record Sale",
    procurement: "Procurement",
    reports: "Reports",
  }
  document.getElementById("headerSubtitle").textContent = titles[sectionId]

  if (sectionId === "dashboard") renderDashboard()
  if (sectionId === "inventory") renderInventory()
  if (sectionId === "sales") renderSales()
  if (sectionId === "procurement") renderProcurement()
  if (sectionId === "reports") renderReports()
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
  const db = getDB()
  const totalProducts = db.products.length
  const totalStock = db.products.reduce((sum, p) => sum + p.stock, 0)
  const lowStockItems = db.products.filter((p) => p.stock < 5)

  document.getElementById("totalProducts").textContent = totalProducts
  document.getElementById("totalStock").textContent = totalStock
  document.getElementById("lowStockCount").textContent = lowStockItems.length

  const lowStockList = document.getElementById("lowStockList")
  if (lowStockItems.length === 0) {
    lowStockList.innerHTML =
      '<p style="color: #64748b; text-align: center; padding: 20px; font-size: 14px; font-weight: 500;">No low stock items</p>'
  } else {
    lowStockList.innerHTML = lowStockItems
      .map(
        (p) => `
            <div class="low-stock-item">
                <div class="low-stock-item-name">${p.name}</div>
                <div class="low-stock-item-stock">${p.stock} pcs</div>
            </div>
        `,
      )
      .join("")
  }
}

function clearAllData() {
  showConfirm("Clear All Data", "Are you sure you want to delete all data? This cannot be undone.", () => {
    localStorage.removeItem(DB_KEY)
    initializeDB()
    showToast("All data cleared")
    renderDashboard()
    renderInventory()
  })
}

// ============================================
// INVENTORY
// ============================================

function renderInventory() {
  const db = getDB()
  const searchTerm = document.getElementById("inventorySearch").value.toLowerCase()

  let filtered = db.products
  if (searchTerm) {
    filtered = db.products.filter(
      (p) => p.name.toLowerCase().includes(searchTerm) || p.company.toLowerCase().includes(searchTerm),
    )
  }

  const list = document.getElementById("inventoryList")
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No products found</p></div>'
  } else {
    list.innerHTML = filtered
      .map(
        (p) => `
            <div class="item">
                <div class="item-info">
                    <div class="item-name">${p.name}</div>
                    <div class="item-detail">${p.company}</div>
                    <div class="item-detail">📦 ${p.barcode}</div>
                </div>
                <div class="item-value ${p.stock < 5 ? "low" : ""}">${p.stock}</div>
                <button class="delete-btn" onclick="deleteProduct('${p.id}')">🗑</button>
            </div>
        `,
      )
      .join("")
  }
}

function deleteProduct(productId) {
  const db = getDB()
  const product = db.products.find((p) => p.id === productId)

  showConfirm("Delete Product", `Delete "${product.name}"?`, () => {
    db.products = db.products.filter((p) => p.id !== productId)
    db.sales = db.sales.filter((s) => s.productId !== productId)
    db.procurements = db.procurements.filter((pr) => pr.productId !== productId)
    saveDB(db)
    showToast("Product deleted")
    renderDashboard()
    renderInventory()
  })
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inventorySearch")?.addEventListener("input", renderInventory)
})

// ============================================
// SALES
// ============================================

let selectedSaleProductId = null

function renderSales() {
  document.getElementById("saleProductSearch").value = ""
  document.getElementById("saleProductInfo").style.display = "none"
  document.getElementById("saleProductSuggestions").innerHTML = ""
  selectedSaleProductId = null
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saleProductSearch")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase()
    const db = getDB()
    const suggestions = document.getElementById("saleProductSuggestions")

    if (term.length < 1) {
      suggestions.innerHTML = ""
      return
    }

    const filtered = db.products.filter((p) => p.name.toLowerCase().includes(term) || p.barcode.includes(term))

    suggestions.innerHTML = filtered
      .map(
        (p) => `
            <div class="suggestion-item" onclick="selectSaleProduct('${p.id}', '${p.name}', ${p.stock})">
                ${p.name} (${p.barcode})
            </div>
        `,
      )
      .join("")
  })
})

function selectSaleProduct(productId, name, stock) {
  selectedSaleProductId = productId
  document.getElementById("saleProductSearch").value = name
  document.getElementById("saleProductName").value = name
  document.getElementById("saleCurrentStock").value = stock
  document.getElementById("saleQuantity").value = ""
  document.getElementById("saleProductInfo").style.display = "block"
  document.getElementById("saleProductSuggestions").innerHTML = ""
}

function recordSale() {
  if (!selectedSaleProductId) {
    showToast("Please select a product")
    return
  }

  const qty = Number.parseInt(document.getElementById("saleQuantity").value)
  const currentStock = Number.parseInt(document.getElementById("saleCurrentStock").value)

  if (!qty || qty < 1) {
    showToast("Please enter a valid quantity")
    return
  }

  if (qty > currentStock) {
    showToast("Insufficient stock")
    return
  }

  const db = getDB()
  const product = db.products.find((p) => p.id === selectedSaleProductId)
  product.stock -= qty

  const saleId = "s" + Date.now()
  db.sales.push({
    id: saleId,
    productId: selectedSaleProductId,
    qty: qty,
    date: new Date().toISOString(),
  })

  saveDB(db)
  showToast("Sale recorded")
  renderSales()
  renderDashboard()
}

// ============================================
// PROCUREMENT
// ============================================

let selectedProcProductId = null

function switchProcurementTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

  event.target.classList.add("active")
  document.getElementById(tab + "Tab").classList.add("active")

  if (tab === "addStock") {
    document.getElementById("procProductSearch").value = ""
    document.getElementById("procProductInfo").style.display = "none"
    document.getElementById("procProductSuggestions").innerHTML = ""
    selectedProcProductId = null
  }
}

function renderProcurement() {
  switchProcurementTab("addStock")
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("procProductSearch")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase()
    const db = getDB()
    const suggestions = document.getElementById("procProductSuggestions")

    if (term.length < 1) {
      suggestions.innerHTML = ""
      return
    }

    const filtered = db.products.filter((p) => p.name.toLowerCase().includes(term) || p.barcode.includes(term))

    suggestions.innerHTML = filtered
      .map(
        (p) => `
            <div class="suggestion-item" onclick="selectProcProduct('${p.id}', '${p.name}', ${p.stock})">
                ${p.name} (${p.barcode})
            </div>
        `,
      )
      .join("")
  })
})

function selectProcProduct(productId, name, stock) {
  selectedProcProductId = productId
  document.getElementById("procProductSearch").value = name
  document.getElementById("procProductName").value = name
  document.getElementById("procCurrentStock").value = stock
  document.getElementById("procQuantity").value = ""
  document.getElementById("procProductInfo").style.display = "block"
  document.getElementById("procProductSuggestions").innerHTML = ""
}

function addStock() {
  if (!selectedProcProductId) {
    showToast("Please select a product")
    return
  }

  const qty = Number.parseInt(document.getElementById("procQuantity").value)

  if (!qty || qty < 1) {
    showToast("Please enter a valid quantity")
    return
  }

  const db = getDB()
  const product = db.products.find((p) => p.id === selectedProcProductId)
  product.stock += qty

  const procId = "pr" + Date.now()
  db.procurements.push({
    id: procId,
    productId: selectedProcProductId,
    qty: qty,
    date: new Date().toISOString(),
  })

  saveDB(db)
  showToast("Stock added")
  renderProcurement()
  renderDashboard()
}

function addNewProduct() {
  const barcode = document.getElementById("newBarcode").value.trim()
  const name = document.getElementById("newProductName").value.trim()
  const company = document.getElementById("newCompanyName").value.trim()
  const stock = Number.parseInt(document.getElementById("newStock").value)

  if (!barcode || !name || !company || !stock || stock < 1) {
    showToast("Please fill all fields")
    return
  }

  const db = getDB()
  const productId = "p" + Date.now()
  db.products.push({
    id: productId,
    barcode: barcode,
    name: name,
    company: company,
    stock: stock,
  })

  saveDB(db)
  showToast("Product added")

  document.getElementById("newBarcode").value = ""
  document.getElementById("newProductName").value = ""
  document.getElementById("newCompanyName").value = ""
  document.getElementById("newStock").value = ""

  renderDashboard()
}

// ============================================
// REPORTS
// ============================================

function renderReports() {
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("reportStartDate").value = today
  document.getElementById("reportEndDate").value = today
  filterReports()
}

function filterReports() {
  const db = getDB()
  const startDate = new Date(document.getElementById("reportStartDate").value)
  const endDate = new Date(document.getElementById("reportEndDate").value)
  endDate.setHours(23, 59, 59, 999)

  const filteredSales = db.sales.filter((s) => {
    const saleDate = new Date(s.date)
    return saleDate >= startDate && saleDate <= endDate
  })

  const filteredProcurements = db.procurements.filter((p) => {
    const procDate = new Date(p.date)
    return procDate >= startDate && procDate <= endDate
  })

  const salesList = document.getElementById("salesReportList")
  if (filteredSales.length === 0) {
    salesList.innerHTML = '<div class="empty-state"><p>No sales records</p></div>'
  } else {
    salesList.innerHTML = filteredSales
      .map((s) => {
        const product = db.products.find((p) => p.id === s.productId)
        const date = new Date(s.date)
        return `
                <div class="report-item">
                    <div class="report-date">${formatDate(date)}</div>
                    <div class="report-detail">${product.name} - ${s.qty} units sold</div>
                </div>
            `
      })
      .join("")
  }

  const procList = document.getElementById("procurementReportList")
  if (filteredProcurements.length === 0) {
    procList.innerHTML = '<div class="empty-state"><p>No procurement records</p></div>'
  } else {
    procList.innerHTML = filteredProcurements
      .map((p) => {
        const product = db.products.find((pr) => pr.id === p.productId)
        const date = new Date(p.date)
        return `
                <div class="report-item">
                    <div class="report-date">${formatDate(date)}</div>
                    <div class="report-detail">${product.name} - ${p.qty} units added</div>
                </div>
            `
      })
      .join("")
  }
}

function formatDate(date) {
  const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  return date.toLocaleDateString("en-US", options)
}

function printReport() {
  window.print()
}

// ============================================
// NOTIFICATIONS
// ============================================

function showToast(message) {
  const toast = document.getElementById("toast")
  toast.textContent = message
  toast.classList.add("show")
  setTimeout(() => toast.classList.remove("show"), 3000)
}

let confirmCallback = null
let confirmRequiresInput = false

function showConfirm(title, message, callback, requiresInput = false) {
  confirmCallback = callback
  confirmRequiresInput = requiresInput

  document.getElementById("confirmTitle").textContent = title
  document.getElementById("confirmMessage").textContent = message

  const input = document.getElementById("confirmInput")
  if (requiresInput) {
    input.style.display = "block"
    input.value = ""
  } else {
    input.style.display = "none"
  }

  document.getElementById("confirmModal").classList.add("show")
}

function closeConfirm() {
  document.getElementById("confirmModal").classList.remove("show")
  confirmCallback = null
}

function executeConfirm() {
  if (confirmRequiresInput) {
    const input = document.getElementById("confirmInput").value
    if (input !== "CONFIRM") {
      showToast("Please type CONFIRM to proceed")
      return
    }
  }

  if (confirmCallback) {
    confirmCallback()
  }
  closeConfirm()
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initializeDB()
  renderDashboard()
})
