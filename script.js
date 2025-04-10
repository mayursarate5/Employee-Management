// Add this at the top of your script.js
try {
    console.log("Firebase initialized:", firebase.app().name);
    console.log("Database reference:", database.ref().toString());
  } catch (e) {
    console.error("Firebase initialization error:", e);
  }

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const database = firebase.database();
    const employeesRef = database.ref('employees');
    
    // DOM Elements
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const employeeTableBody = document.getElementById('employeeTableBody');
    const employeeModal = document.getElementById('employeeModal');
    const confirmModal = document.getElementById('confirmModal');
    const employeeForm = document.getElementById('employeeForm');
    const modalTitle = document.getElementById('modalTitle');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const closeBtns = document.querySelectorAll('.close');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    
    // Employee data
    let employees = [];
    let currentEmployeeId = null;
    let employeeToDelete = null;
    
    // Initialize the app
    loadEmployees();
    
    // Event Listeners
    addEmployeeBtn.addEventListener('click', openAddEmployeeModal);
    employeeForm.addEventListener('submit', handleFormSubmit);
    searchBtn.addEventListener('click', filterEmployees);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') filterEmployees();
    });
    confirmDeleteBtn.addEventListener('click', deleteEmployee);
    cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (employeeModal.style.display === 'block') {
                closeEmployeeModal();
            } else if (confirmModal.style.display === 'block') {
                closeConfirmModal();
            }
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === employeeModal) closeEmployeeModal();
        else if (event.target === confirmModal) closeConfirmModal();
    });
    
    // Database Functions
    function loadEmployees() {
        employeesRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert Firebase object to array while preserving keys
                employees = Object.entries(data).map(([key, value]) => {
                    return { ...value, id: key };
                });
            } else {
                employees = [];
            }
            renderEmployeeTable();
        }, (error) => {
            console.error("Error loading employees:", error);
            alert("Failed to load employees. See console for details.");
        });
    }
    
    function saveEmployee(employee) {
        if (currentEmployeeId) {
            // Update existing employee using Firebase's key
            employeesRef.child(currentEmployeeId).update(employee);
        } else {
            // Add new employee - let Firebase generate the key
            const newRef = employeesRef.push();
            // Use Firebase's key as the ID
            employee.id = newRef.key;
            newRef.set(employee);
        }
    }
    
    function deleteEmployee() {
        if (!employeeToDelete) return;
    
        const employeeData = employees.find(emp => emp.id === employeeToDelete);
        if (!employeeData) {
            alert("Employee not found.");
            return;
        }
    
        // Archive employee before deletion
        const backupRef = database.ref('deletedEmployees').push();
        backupRef.set({
            ...employeeData,
            deletedAt: new Date().toISOString()
        }).then(() => {
            // Proceed with deletion after backup
            employeesRef.child(employeeToDelete).remove()
                .then(() => {
                    console.log("Employee deleted and backed up.");
                    closeConfirmModal();
                })
                .catch(error => {
                    console.error("Delete failed:", error);
                    alert("Failed to delete employee.");
                });
        }).catch(err => {
            console.error("Backup before delete failed:", err);
            alert("Failed to backup employee before delete.");
        });
    }
    
    
    // UI Functions
    function renderEmployeeTable(employeesToRender = employees) {
        employeeTableBody.innerHTML = '';
        
        if (employeesToRender.length === 0) {
            employeeTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center;">No employees found</td>
                </tr>
            `;
            return;
        }
        
        employeesToRender.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.id || ''}</td>
                <td>${employee.name}</td>
                <td>${employee.email}</td>
                <td>${employee.department}</td>
                <td>${employee.position}</td>
                <td>$${employee.salary ? employee.salary.toLocaleString() : '0'}</td>
                <td class="actions">
                    <button class="action-btn edit-btn" data-key="${employee.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-key="${employee.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            employeeTableBody.appendChild(row);
        });
        
        // Update event listeners to use data-key instead of data-id
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const key = this.getAttribute('data-key');
                openEditEmployeeModal(key);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const key = this.getAttribute('data-key');
                openConfirmModal(key);
            });
        });
    }
    
    function openAddEmployeeModal() {
        currentEmployeeId = null;
        modalTitle.textContent = 'Add New Employee';
        document.getElementById('employeeForm').reset();
        employeeModal.style.display = 'block';
    }
    
    function openEditEmployeeModal(key) {
        const employee = employees.find(emp => emp.id === key);
        if (employee) {
            currentEmployeeId = key;
            modalTitle.textContent = 'Edit Employee';
            document.getElementById('employeeId').value = employee.id || '';
            document.getElementById('name').value = employee.name || '';
            document.getElementById('email').value = employee.email || '';
            document.getElementById('department').value = employee.department || '';
            document.getElementById('position').value = employee.position || '';
            document.getElementById('salary').value = employee.salary || '';
            employeeModal.style.display = 'block';
        }
    }
    
    function closeEmployeeModal() {
        employeeModal.style.display = 'none';
    }
    
    function openConfirmModal(id) {
        employeeToDelete = id;
        confirmModal.style.display = 'block';
    }
    
    function closeConfirmModal() {
        employeeToDelete = null;
        confirmModal.style.display = 'none';
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const employeeData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            department: document.getElementById('department').value,
            position: document.getElementById('position').value,
            salary: parseFloat(document.getElementById('salary').value),
            id: document.getElementById('employeeId').value || Date.now().toString()
        };
        
        saveEmployee(employeeData);
        closeEmployeeModal();
    }
    
    function filterEmployees() {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            renderEmployeeTable();
            return;
        }
        
        const filteredEmployees = employees.filter(emp => 
            (emp.name && emp.name.toLowerCase().includes(searchTerm)) ||
            (emp.email && emp.email.toLowerCase().includes(searchTerm)) ||
            (emp.department && emp.department.toLowerCase().includes(searchTerm)) ||
            (emp.position && emp.position.toLowerCase().includes(searchTerm)) ||
            (emp.id && emp.id.toString().includes(searchTerm))
        );
        
        renderEmployeeTable(filteredEmployees);
    }
});
