let labels = [];
let data = [];

// Code for the new donut chart (toolAccessChart)
async function loadStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    // Labels tells the number of tools and data tells the count of employees with access to those tools
    labels = stats.tool_access_counts.labels;
    data = stats.tool_access_counts.data;
}

console.log('Loading stats...');
loadStats().then(() => {
    console.log('Stats loaded:', labels, data);
    // Update the chart with the loaded data
    toolAccessChart.data.labels = labels;
    toolAccessChart.data.datasets[0].data = data;
    toolAccessChart.update();
}).catch(error => {
    console.error('Error loading stats:', error);
});

const accessCtx = document.getElementById('toolAccessChart').getContext('2d');

const toolAccessChart = new Chart(accessCtx, {
    type: 'doughnut',
    data: {
        labels: labels,
        datasets: [{
            label: labels,
            data: data,
            backgroundColor: [
                '#FF9F40', // Orange
                '#5C6BC0'  // Indigo
            ],
            borderColor: [
                '#ffffff',
                '#ffffff'
            ],
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Tool Access Distribution'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw;
                        const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    }
});


const ctx = document.getElementById('toolUsageChart').getContext('2d');

const toolUsageChart = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: ['User Access', 'Admin Access', 'Super Admin Access'],
        datasets: [{
            label: 'Number of Employees',
            data: [
                total_users,
                total_admins,
                total_super_admins],

            backgroundColor: [
                '#FF6384', // Vibrant Red
                '#36A2EB', // Bright Blue
                '#FFCD56', // Sunny Yellow
                '#4BC0C0', // Teal
                '#9966FF'  // Purple
            ],
            borderColor: [
                '#ffffff',
                '#ffffff',
                '#ffffff'
            ],
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Access Type Count'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = total_admins + total_users + total_super_admins;
                        const percentage = ((value / total) * 100).toFixed(2);
                        return `${label}: ${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    }
});

let employeeDetails = {};

// Code for employee search suggestions
document.addEventListener('DOMContentLoaded',async function() {
    const searchInput = document.getElementById('employee-search-input');
    const suggestionsList = document.getElementById('employee-suggestions');

    // Create the suggestions list if it doesn't exist
    let employeeNames = [];

    try {
        const response = await fetch('/get_employees');
        const data = await response.json();
        employeeNames = data.names.sort()
        tools = data.tools;
    } catch (error) {
        console.error('Error fetching employee names:', error);
    }
    
    try {
        const response = await fetch('/get_employees_details');
        const data = await response.json();
        employeeDetails = data
        console.log('Employee details fetched:', employeeDetails);
        
    } catch (error) {
        console.error('Error fetching employee names:', error);
    }


    function displaySuggestions(filter = '') {
        suggestionsList.innerHTML = ''; // Clear previous suggestions
        const filteredNames = employeeNames.filter(name => 
            name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredNames.length > 0) {
            filteredNames.forEach(name => {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = name.toUpperCase();
                suggestionItem.addEventListener('click', function() {
                    searchInput.value = name.toUpperCase();
                    suggestionsList.style.display = 'none';
                    displayEmployeeDetails(name);
                });
                suggestionsList.appendChild(suggestionItem);
            });

            // Calculate space below the input
            const inputRect = searchInput.getBoundingClientRect();
            const spaceBelow = window.innerHeight - inputRect.bottom;
            const suggestionsHeight = 200; // Use the max-height defined in CSS

            // Check if there's enough space below, otherwise position above
            if (spaceBelow < suggestionsHeight && inputRect.top > suggestionsHeight) {
                 // Position above
                suggestionsList.style.top = 'auto';
                suggestionsList.style.bottom = '100%';
            } else {
                // Position below
                suggestionsList.style.top = '100%';
                suggestionsList.style.bottom = 'auto';
            }

            suggestionsList.style.display = 'block';
        } else {
            suggestionsList.style.display = 'none';
            document.querySelector('.employee-details-card').style.display = 'none';
        }
    }

    // Function to display employee details and tool access
    function displayEmployeeDetails(employeeName) {
        const employeeDetailsCard = document.querySelector('.employee-details-card');
        const employeeNameDiv = employeeDetailsCard.querySelector('.employee-name');
        const toolAccessTableBody = employeeDetailsCard.querySelector('.tool-access-table tbody');

        // Sample tool access data (replace with actual data retrieval logic)
        // const sampleToolAccess = {
        //     'maitreya moharil': { 'ARITHSHIVE': 'User', 'HRMS': 'Admin', 'TRUEDAY': 'Super Admin' },
        //     'john doe': { 'ARITHSHIVE': 'User', 'HRMS': 'User', 'TRUEDAY': 'No Access' },
        // }
        const sampleToolAccess = employeeDetails // Use the fetched employee details

        const employeeAccess = sampleToolAccess[employeeName.toLowerCase()] || {};
        // const allTools = ['HRMS', 'TRUEDAY', 'XYZ']; // List of all available tools
        const allTools = tools // List of all available tools

        employeeNameDiv.textContent = employeeName.toUpperCase(); // Display selected employee name
        toolAccessTableBody.innerHTML = ''; // Clear previous table rows

        // Sort tools: first show tools with access, then tools without access
        const sortedTools = allTools.sort((a, b) => {
            const aHasAccess = employeeAccess[a] ? 1 : 0;
            const bHasAccess = employeeAccess[b] ? 1 : 0;
            return bHasAccess - aHasAccess; // Tools with access come first
        });

        // Create rows for all tools, whether the user has access or not
        sortedTools.forEach(tool => {
            const accessLevel = employeeAccess[tool];
            const row = document.createElement('tr');
            row.setAttribute('data-employee', employeeName.toLowerCase());
            row.setAttribute('data-tool', tool);
            
            if (accessLevel) {
                // User has access to this tool
                row.innerHTML = `
                    <td>${tool}</td>
                    <td class="access-cell">
                        <div class="access-options">
                            <input type="radio" id="${employeeName.toLowerCase()}_${tool}_user" name="${employeeName.toLowerCase()}_${tool}_access" value="User" ${accessLevel === 'User' ? 'checked' : ''}>
                            <label for="${employeeName.toLowerCase()}_${tool}_user">User</label>
                            
                            <input type="radio" id="${employeeName.toLowerCase()}_${tool}_developer" name="${employeeName.toLowerCase()}_${tool}_access" value="Developer" ${accessLevel === 'Developer' ? 'checked' : ''}>
                            <label for="${employeeName.toLowerCase()}_${tool}_developer">Developer</label>
                            <input type="radio" id="${employeeName.toLowerCase()}_${tool}_admin" name="${employeeName.toLowerCase()}_${tool}_access" value="Admin" ${accessLevel === 'Admin' ? 'checked' : ''}>
                            <label for="${employeeName.toLowerCase()}_${tool}_admin">Admin</label>
                            <input type="radio" id="${employeeName.toLowerCase()}_${tool}_superuser" name="${employeeName.toLowerCase()}_${tool}_access" value="Superuser" ${accessLevel === 'Superuser' ? 'checked' : ''}>
                            <label for="${employeeName.toLowerCase()}_${tool}_superuser">Superuser</label>
                        </div>
                    </td>
                    <td><span class="remove-tool">❌</span></td>
                `;
            } else {
                // User doesn't have access to this tool
                row.innerHTML = `
                    <td>${tool}</td>
                    <td class="access-cell">No Access</td>
                    <td><button class="add-tool">+ Add Access</button></td>
                `;
            }
            
            // Add event listener for radio button changes to update sample data
            row.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        const employee = this.getAttribute('data-employee') || employeeName.toLowerCase();
                        const toolName = this.getAttribute('data-tool') || tool;
                        const newAccessLevel = this.value;
                        
                        // Update the sample data
                        if (sampleToolAccess[employee]) {
                            sampleToolAccess[employee][toolName] = newAccessLevel;
                            console.log(`Updated ${employee}'s access for ${toolName} to ${newAccessLevel}`);
                        }
                    }
                });
            });

            toolAccessTableBody.appendChild(row);
        });

        employeeDetailsCard.style.display = 'block'; // Show the employee details card

        // Add event listeners to the remove icons
        toolAccessTableBody.querySelectorAll('.remove-tool').forEach(icon => {
            icon.addEventListener('click', function(event) {
                event.stopPropagation();
                const row = this.closest('tr');
                const employee = row.getAttribute('data-employee');
                const toolToRemove = row.getAttribute('data-tool');

                // Instead of removing the row, update it to show "No Access" and add button
                row.innerHTML = `
                    <td>${toolToRemove}</td>
                    <td class="access-cell">No Access</td>
                    <td><button class="add-tool">+ Add Access</button></td>
                `;

                // Update the sample data
                if (sampleToolAccess[employee] && sampleToolAccess[employee][toolToRemove]) {
                    delete sampleToolAccess[employee][toolToRemove];
                }

                // Add event listener to the new add button
                row.querySelector('.add-tool').addEventListener('click', function(event) {
                    event.stopPropagation();
                    const employee = row.getAttribute('data-employee');
                    const toolToAdd = row.getAttribute('data-tool');

                    // Update the row to show access options
                    row.innerHTML = `
                        <td>${toolToAdd}</td>
                        <td class="access-cell">
                            <div class="access-options">
                                <input type="radio" id="${employee}_${toolToAdd}_user" name="${employee}_${toolToAdd}_access" value="User" checked>
                                <label for="${employee}_${toolToAdd}_user">User</label>
                                
                                <input type="radio" id="${employee}_${toolToAdd}_developer" name="${employee}_${toolToAdd}_access" value="Developer">
                                <label for="${employee}_${toolToAdd}_developer">Developer</label>
                                <input type="radio" id="${employee}_${toolToAdd}_admin" name="${employee}_${toolToAdd}_access" value="Admin">
                                <label for="${employee}_${toolToAdd}_admin">Admin</label>
                                <input type="radio" id="${employee}_${toolToAdd}_superuser" name="${employee}_${toolToAdd}_access" value="Superuser">
                                <label for="${employee}_${toolToAdd}_superuser">Superuser</label>
                            </div>
                        </td>
                        <td><span class="remove-tool">❌</span></td>
                    `;

                    // Initialize the new access options
                    if (!sampleToolAccess[employee]) {
                        sampleToolAccess[employee] = {};
                    }
                    sampleToolAccess[employee][toolToAdd] = 'User'; // Default to User access

                    // Add event listener for the new remove icon
                    row.querySelector('.remove-tool').addEventListener('click', function(event) {
                        event.stopPropagation();
                        // Instead of removing the row, update it to show "No Access" and add button
                        row.innerHTML = `
                            <td>${toolToAdd}</td>
                            <td class="access-cell">No Access</td>
                            <td><button class="add-tool">+ Add Access</button></td>
                        `;
                        delete sampleToolAccess[employee][toolToAdd];
                    });

                    // Add event listeners for the new radio buttons
                    row.querySelectorAll('input[type="radio"]').forEach(radio => {
                        radio.addEventListener('change', function() {
                            if (this.checked) {
                                sampleToolAccess[employee][toolToAdd] = this.value;
                                console.log(`Updated ${employee}'s access for ${toolToAdd} to ${this.value}`);
                            }
                        });
                    });
                });

                // NEW: Send DELETE request to backend
                fetch('/delete_access', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        employee,
                        tool: toolToRemove
                    })
                }).then(response => response.json())
                .then(data => {
                    if (data.status !== 'success') {
                        alert('Failed to remove access from server!');
                        console.error(data.error);
                    }
                });

            });
        });

        // Add event listeners to the add buttons
        toolAccessTableBody.querySelectorAll('.add-tool').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const row = this.closest('tr');
                const employee = row.getAttribute('data-employee');
                const toolToAdd = row.getAttribute('data-tool');

                // Update the row to show access options
                row.innerHTML = `
                    <td>${toolToAdd}</td>
                    <td class="access-cell">
                        <div class="access-options">
                            <input type="radio" id="${employee}_${toolToAdd}_user" name="${employee}_${toolToAdd}_access" value="User" checked>
                            <label for="${employee}_${toolToAdd}_user">User</label>
                            
                            <input type="radio" id="${employee}_${toolToAdd}_developer" name="${employee}_${toolToAdd}_access" value="Developer">
                            <label for="${employee}_${toolToAdd}_developer">Developer</label>
                            <input type="radio" id="${employee}_${toolToAdd}_admin" name="${employee}_${toolToAdd}_access" value="Admin">
                            <label for="${employee}_${toolToAdd}_admin">Admin</label>
                            <input type="radio" id="${employee}_${toolToAdd}_superuser" name="${employee}_${toolToAdd}_access" value="Superuser">
                            <label for="${employee}_${toolToAdd}_superuser">Superuser</label>
                        </div>
                    </td>
                    <td><span class="remove-tool">❌</span></td>
                `;

                // Initialize the new access options
                if (!sampleToolAccess[employee]) {
                    sampleToolAccess[employee] = {};
                }
                sampleToolAccess[employee][toolToAdd] = 'User'; // Default to User access

                // Add event listener for the new remove icon
                row.querySelector('.remove-tool').addEventListener('click', function(event) {
                    event.stopPropagation();
                    // Instead of removing the row, update it to show "No Access" and add button
                    row.innerHTML = `
                        <td>${toolToAdd}</td>
                        <td class="access-cell">No Access</td>
                        <td><button class="add-tool">+ Add Access</button></td>
                    `;
                    delete sampleToolAccess[employee][toolToAdd];
                });

                // Add event listeners for the new radio buttons
                row.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) {
                            sampleToolAccess[employee][toolToAdd] = this.value;
                            console.log(`Updated ${employee}'s access for ${toolToAdd} to ${this.value}`);
                        }
                    });
                });
            });
        });
    }

    document.getElementById('saveAccessBtn').addEventListener('click', () => {

        const payload = employeeDetails
    
        fetch('/save_access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Access saved successfully!');
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        });
    });

    // Display all suggestions when the input is focused
    searchInput.addEventListener('focus', function() {
        displaySuggestions(searchInput.value);
    });

    // Filter suggestions on input
    searchInput.addEventListener('input', function() {
        displaySuggestions(searchInput.value);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.employee-search-container')) {
            suggestionsList.style.display = 'none';
        }
    });

    // Prevent suggestions from hiding when clicking inside the suggestions list
    suggestionsList.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});

function destroySession() {
    fetch('/logout')
        .then(() => {
            sessionStorage.clear();
            window.location.replace('/'); // Prevent back navigation
        });
}
