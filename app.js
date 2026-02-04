// ===== CONFIGURATION =====
const API_BASE_URL = 'https://api.escuelajs.co/api/v1/products';

// ===== STATE MANAGEMENT =====
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortField = null;
let sortDirection = 'asc';
let searchTerm = '';

// ===== DOM ELEMENTS =====
const elements = {
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    itemsPerPage: document.getElementById('itemsPerPage'),
    productsBody: document.getElementById('productsBody'),
    pagination: document.getElementById('pagination'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    tableContainer: document.getElementById('tableContainer'),
    paginationContainer: document.getElementById('paginationContainer'),
    totalProducts: document.getElementById('totalProducts'),
    showingFrom: document.getElementById('showingFrom'),
    showingTo: document.getElementById('showingTo'),
    showingTotal: document.getElementById('showingTotal'),
    exportCSV: document.getElementById('exportCSV'),
    createProductBtn: document.getElementById('createProductBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    notificationToast: document.getElementById('notificationToast'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon')
};

// ===== CATEGORY MAPPING =====
const categoryClasses = {
    1: 'category-clothes',
    2: 'category-electronics',
    3: 'category-furniture',
    4: 'category-shoes',
    5: 'category-miscellaneous'
};

const categoryNames = {
    1: 'Clothes',
    2: 'Electronics',
    3: 'Furniture',
    4: 'Shoes',
    5: 'Miscellaneous'
};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

// ===== INITIALIZE TOOLTIPS =====
function initTooltips() {
    // Dispose any existing tooltips first
    const existingTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    existingTooltips.forEach(el => {
        const tooltip = bootstrap.Tooltip.getInstance(el);
        if (tooltip) {
            tooltip.dispose();
        }
    });

    // Initialize new tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover',
            delay: { show: 300, hide: 100 },
            container: 'body'
        });
    });
}

// ===== FETCH PRODUCTS =====
async function fetchProducts() {
    try {
        showLoading(true);
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('Failed to fetch products');

        allProducts = await response.json();
        filteredProducts = [...allProducts];

        elements.totalProducts.textContent = allProducts.length;

        renderProducts();
        showLoading(false);
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Lỗi', 'Không thể tải dữ liệu sản phẩm!', 'error');
        showLoading(false);
    }
}

// ===== RENDER PRODUCTS =====
function renderProducts() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    if (paginatedProducts.length === 0) {
        elements.productsBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h5>Không tìm thấy sản phẩm nào</h5>
                        <p class="text-muted">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        elements.productsBody.innerHTML = paginatedProducts.map((product, index) => {
            const imageUrl = getValidImageUrl(product.images);
            const categoryId = product.category?.id || 5;
            const categoryName = product.category?.name || categoryNames[categoryId] || 'Miscellaneous';
            const categoryClass = categoryClasses[categoryId] || 'category-miscellaneous';
            const description = product.description || 'Không có mô tả';
            const truncatedDescription = description.length > 200 ? description.substring(0, 200) + '...' : description;
            // Escape HTML special characters for tooltip
            const escapedDescription = truncatedDescription.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            return `
                <tr class="product-row" data-id="${product.id}" style="opacity: 0;"
                    data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true"
                    data-bs-title="<strong>📝 Mô tả:</strong><br>${escapedDescription}">
                    <td>
                        <span class="fw-bold text-primary">#${product.id}</span>
                    </td>
                    <td>
                        <img src="${imageUrl}" alt="${product.title}" class="product-image" 
                             onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                    </td>
                    <td>
                        <span class="product-title" title="${product.title}">${product.title}</span>
                    </td>
                    <td>
                        <span class="price-tag">$${formatPrice(product.price)}</span>
                    </td>
                    <td>
                        <span class="category-badge ${categoryClass}">
                            <i class="bi bi-tag-fill me-1"></i>${categoryName}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="action-btn view" onclick="viewProduct(${product.id})" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id}, event)" title="Xóa">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Initialize Bootstrap tooltips for new rows
        initTooltips();
    }

    updatePaginationInfo();
    renderPagination();
}

// ===== GET VALID IMAGE URL =====
function getValidImageUrl(images) {
    if (!images || images.length === 0) {
        return 'https://via.placeholder.com/60x60?text=No+Image';
    }

    let imageUrl = images[0];

    // Clean up the URL if it contains brackets
    if (typeof imageUrl === 'string') {
        imageUrl = imageUrl.replace(/[\[\]"]/g, '');
    }

    // Check if it's a valid URL
    try {
        new URL(imageUrl);
        return imageUrl;
    } catch {
        return 'https://via.placeholder.com/60x60?text=No+Image';
    }
}

// ===== FORMAT PRICE =====
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(price);
}

// ===== PAGINATION =====
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    elements.pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderProducts();

    // Scroll to top of table
    elements.tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updatePaginationInfo() {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredProducts.length);

    elements.showingFrom.textContent = filteredProducts.length > 0 ? start : 0;
    elements.showingTo.textContent = end;
    elements.showingTotal.textContent = filteredProducts.length;

    elements.paginationContainer.style.display = filteredProducts.length > 0 ? 'flex' : 'none';
}

// ===== SEARCH =====
function handleSearch(term) {
    searchTerm = term.toLowerCase().trim();

    elements.clearSearch.style.display = searchTerm ? 'block' : 'none';

    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            product.title.toLowerCase().includes(searchTerm)
        );
    }

    // Apply current sort if any
    if (sortField) {
        sortProducts(sortField, false);
    }

    currentPage = 1;
    renderProducts();
}

// ===== SORTING =====
function sortProducts(field, toggleDirection = true) {
    if (toggleDirection) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
    }

    filteredProducts.sort((a, b) => {
        let valueA, valueB;

        switch (field) {
            case 'id':
                valueA = a.id;
                valueB = b.id;
                break;
            case 'title':
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
                break;
            case 'price':
                valueA = a.price;
                valueB = b.price;
                break;
            default:
                return 0;
        }

        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Update sort indicators
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === field) {
            th.classList.add(sortDirection);
        }
    });

    renderProducts();
}

// ===== VIEW PRODUCT =====
function viewProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    // Fill form
    document.getElementById('editId').value = product.id;
    document.getElementById('editTitle').value = product.title;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editCategory').value = product.category?.id || 1;

    // Handle images
    const images = product.images || [];
    const imagesUrl = images.length > 0 ? getValidImageUrl(images) : '';
    document.getElementById('editImages').value = imagesUrl;

    // Render carousel
    const carouselInner = document.getElementById('detailImages');
    if (images.length > 0) {
        carouselInner.innerHTML = images.map((img, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${getValidImageUrl([img])}" class="d-block w-100" alt="${product.title}"
                     onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            </div>
        `).join('');
    } else {
        carouselInner.innerHTML = `
            <div class="carousel-item active">
                <img src="https://via.placeholder.com/400x300?text=No+Image" class="d-block w-100" alt="No image">
            </div>
        `;
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// ===== UPDATE PRODUCT =====
async function updateProduct() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value.trim();
    const price = parseFloat(document.getElementById('editPrice').value);
    const description = document.getElementById('editDescription').value.trim();
    const categoryId = parseInt(document.getElementById('editCategory').value);
    const imagesUrl = document.getElementById('editImages').value.trim();

    if (!title || isNaN(price) || !description) {
        showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    const updateData = {
        title: title,
        price: price,
        description: description,
        categoryId: categoryId,
        images: imagesUrl ? [imagesUrl] : ['https://i.imgur.com/1twoaDy.jpeg']
    };

    try {
        elements.saveEditBtn.disabled = true;
        elements.saveEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error('Failed to update product');

        const updatedProduct = await response.json();

        // Update local data
        const index = allProducts.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            allProducts[index] = { ...allProducts[index], ...updatedProduct };
        }

        // Reapply filters
        handleSearch(searchTerm);

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();

        showToast('Thành công', 'Sản phẩm đã được cập nhật!', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Lỗi', 'Không thể cập nhật sản phẩm!', 'error');
    } finally {
        elements.saveEditBtn.disabled = false;
        elements.saveEditBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Lưu thay đổi';
    }
}

// ===== CREATE PRODUCT =====
async function createProduct() {
    const title = document.getElementById('createTitle').value.trim();
    const price = parseFloat(document.getElementById('createPrice').value);
    const description = document.getElementById('createDescription').value.trim();
    const categoryId = parseInt(document.getElementById('createCategory').value);
    const imagesUrl = document.getElementById('createImages').value.trim();

    if (!title || isNaN(price) || !description || !categoryId || !imagesUrl) {
        showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    const newProduct = {
        title: title,
        price: price,
        description: description,
        categoryId: categoryId,
        images: [imagesUrl]
    };

    try {
        elements.createProductBtn.disabled = true;
        elements.createProductBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProduct)
        });

        if (!response.ok) throw new Error('Failed to create product');

        const createdProduct = await response.json();

        // Add to local data
        allProducts.unshift(createdProduct);
        elements.totalProducts.textContent = allProducts.length;

        // Reapply filters
        handleSearch(searchTerm);

        // Reset form
        document.getElementById('createForm').reset();

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();

        showToast('Thành công', 'Sản phẩm mới đã được tạo!', 'success');
    } catch (error) {
        console.error('Error creating product:', error);
        showToast('Lỗi', 'Không thể tạo sản phẩm!', 'error');
    } finally {
        elements.createProductBtn.disabled = false;
        elements.createProductBtn.innerHTML = '<i class="bi bi-plus-lg me-2"></i>Tạo sản phẩm';
    }
}

// ===== DELETE PRODUCT =====
async function deleteProduct(id, event) {
    event.stopPropagation();

    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete product');

        // Remove from local data
        allProducts = allProducts.filter(p => p.id !== id);
        elements.totalProducts.textContent = allProducts.length;

        // Reapply filters
        handleSearch(searchTerm);

        showToast('Thành công', 'Sản phẩm đã được xóa!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Lỗi', 'Không thể xóa sản phẩm!', 'error');
    }
}

// ===== EXPORT CSV =====
function exportToCSV() {
    if (filteredProducts.length === 0) {
        showToast('Thông báo', 'Không có dữ liệu để xuất!', 'warning');
        return;
    }

    // Prepare CSV headers
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description', 'Images'];

    // Prepare CSV rows
    const rows = filteredProducts.map(product => [
        product.id,
        `"${(product.title || '').replace(/"/g, '""')}"`,
        product.price,
        `"${(product.category?.name || 'N/A').replace(/"/g, '""')}"`,
        `"${(product.description || '').replace(/"/g, '""')}"`,
        `"${(product.images || []).join(', ').replace(/"/g, '""')}"`
    ]);

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Thành công', `Đã xuất ${filteredProducts.length} sản phẩm ra file CSV!`, 'success');
}

// ===== SHOW LOADING =====
function showLoading(show) {
    elements.loadingSpinner.style.display = show ? 'block' : 'none';
    elements.tableContainer.style.display = show ? 'none' : 'block';
    elements.paginationContainer.style.display = show ? 'none' : 'flex';
}

// ===== SHOW TOAST =====
function showToast(title, message, type = 'success') {
    elements.toastTitle.textContent = title;
    elements.toastMessage.textContent = message;

    // Update icon based on type
    const iconClasses = {
        success: 'bi-check-circle-fill text-success',
        error: 'bi-x-circle-fill text-danger',
        warning: 'bi-exclamation-circle-fill text-warning',
        info: 'bi-info-circle-fill text-info'
    };

    elements.toastIcon.className = `bi ${iconClasses[type] || iconClasses.success} me-2`;

    const toast = new bootstrap.Toast(elements.notificationToast);
    toast.show();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search input with debounce
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 300);
    });

    // Clear search
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        handleSearch('');
    });

    // Items per page
    elements.itemsPerPage.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderProducts();
    });

    // Sortable columns
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            sortProducts(th.dataset.sort);
        });
    });

    // Export CSV
    elements.exportCSV.addEventListener('click', exportToCSV);

    // Create product
    elements.createProductBtn.addEventListener('click', createProduct);

    // Save edit
    elements.saveEditBtn.addEventListener('click', updateProduct);

    // Row click to view details
    elements.productsBody.addEventListener('click', (e) => {
        const row = e.target.closest('.product-row');
        if (row && !e.target.closest('.action-btn')) {
            const id = parseInt(row.dataset.id);
            viewProduct(id);
        }
    });
}
