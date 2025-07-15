// Authentication form handling
document.addEventListener('DOMContentLoaded', function() {
  // Tab switching for login/register
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  
  authTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetForm = this.getAttribute('data-form');
      
      // Remove active class from all tabs and forms
      authTabs.forEach(t => t.classList.remove('active'));
      authForms.forEach(f => f.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding form
      this.classList.add('active');
      document.getElementById(targetForm).classList.add('active');
    });
  });
  
  // Form validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const requiredFields = this.querySelectorAll('input[required], select[required]');
      let isValid = true;
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.style.borderColor = '#dc3545';
        } else {
          field.style.borderColor = '#ddd';
        }
      });
      
      if (!isValid) {
        e.preventDefault();
        showMessage('Please fill in all required fields', 'error');
      }
    });
  });
  
  // Delete expense functionality
  const deleteButtons = document.querySelectorAll('.delete-expense');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const expenseId = this.getAttribute('data-id');
      
      if (confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(expenseId);
      }
    });
  });
  
  // Add expense form validation
  const addExpenseForm = document.getElementById('add-expense-form');
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', function(e) {
      const amount = document.getElementById('amount').value;
      const date = document.getElementById('date').value;
      
      if (parseFloat(amount) <= 0) {
        e.preventDefault();
        showMessage('Amount must be greater than 0', 'error');
        return;
      }
      
      if (new Date(date) > new Date()) {
        e.preventDefault();
        showMessage('Date cannot be in the future', 'error');
        return;
      }
    });
  }
  
  // Set today's date as default for expense date
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
  
  // Filter expenses by category
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function() {
      const selectedCategory = this.value;
      const expenseItems = document.querySelectorAll('.expense-item');
      
      expenseItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (selectedCategory === 'all' || itemCategory === selectedCategory) {
          item.style.display = 'grid';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
  
  // Search expenses
  const searchInput = document.getElementById('search-expenses');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const expenseItems = document.querySelectorAll('.expense-item');
      
      expenseItems.forEach(item => {
        const description = item.querySelector('.expense-description').textContent.toLowerCase();
        if (description.includes(searchTerm)) {
          item.style.display = 'grid';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
});

// Delete expense function
async function deleteExpense(expenseId) {
  try {
    const response = await fetch(`/expense/${expenseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Remove the expense item from the DOM
      const expenseItem = document.querySelector(`[data-expense-id="${expenseId}"]`);
      if (expenseItem) {
        expenseItem.remove();
      }
      
      showMessage('Expense deleted successfully', 'success');
      
      // Refresh the page to update totals
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showMessage('Failed to delete expense', 'error');
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    showMessage('Failed to delete expense', 'error');
  }
}

// Show message function
function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message element
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.textContent = message;
  
  // Insert message at the top of the main content
  const main = document.querySelector('main');
  if (main) {
    main.insertBefore(messageElement, main.firstChild);
  }
  
  // Auto-remove message after 5 seconds
  setTimeout(() => {
    messageElement.remove();
  }, 5000);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Chart functionality (if Chart.js is available)
function createExpenseChart() {
  const canvas = document.getElementById('expense-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  
  const ctx = canvas.getContext('2d');
  
  // Get category data from the page
  const categoryData = {};
  const expenseItems = document.querySelectorAll('.expense-item');
  
  expenseItems.forEach(item => {
    const category = item.getAttribute('data-category');
    const amount = parseFloat(item.querySelector('.expense-amount').textContent.replace('$', ''));
    
    if (categoryData[category]) {
      categoryData[category] += amount;
    } else {
      categoryData[category] = amount;
    }
  });
  
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#ffeaa7',
          '#74b9ff',
          '#fd79a8',
          '#fdcb6e',
          '#e17055',
          '#a29bfe',
          '#ddd'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        }
      }
    }
  });
}

// Initialize chart when page loads
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(createExpenseChart, 100);
});

// Export expenses to CSV
function exportToCSV() {
  const expenses = [];
  const expenseItems = document.querySelectorAll('.expense-item');
  
  // Add header
  expenses.push(['Description', 'Amount', 'Category', 'Date']);
  
  expenseItems.forEach(item => {
    const description = item.querySelector('.expense-description').textContent;
    const amount = item.querySelector('.expense-amount').textContent;
    const category = item.getAttribute('data-category');
    const date = item.querySelector('.expense-date').textContent;
    
    expenses.push([description, amount, category, date]);
  });
  
  // Create CSV content
  const csvContent = expenses.map(row => row.join(',')).join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expenses.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// Add export button event listener
document.addEventListener('DOMContentLoaded', function() {
  const exportButton = document.getElementById('export-csv');
  if (exportButton) {
    exportButton.addEventListener('click', exportToCSV);
  }
});