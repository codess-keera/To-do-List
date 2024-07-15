let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

const listContainer = document.getElementById('list-container');
const addButton = document.querySelector('.add-task-button');
const taskModal = document.getElementById('add-task-modal');
const subtaskModal = document.getElementById('add-subtask-modal');
const saveTaskButton = document.getElementById('save-task');
const saveSubtaskButton = document.getElementById('save-subtask');
const addSubtaskButton = document.getElementById('add-subtask');
const subtasksList = document.getElementById('subtasks-list');
const searchInput = document.getElementById('input-box');
const searchButton = document.getElementById('add');
const menuIcon = document.querySelector('.menu-icon');
const sortFilterDialog = document.getElementById('sort-filter-dialog');
const applyButton = document.querySelector('#sort-filter-dialog .dialog-content button:first-of-type');
const cancelButton = document.querySelector('#sort-filter-dialog .dialog-content button:last-of-type');


let currentTaskId = -1;
let currentSubtaskIndex = -1;

function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function openSortFilterDialog() {
    sortFilterDialog.style.display = 'block';
}

function closeSortFilterDialog() {
    sortFilterDialog.style.display = 'none';
}

function applySortAndFilter() {
    const sortBy = document.getElementById('sort-by').value;
    const dueDateStart = document.getElementById('due-date-start').value;
    const dueDateEnd = document.getElementById('due-date-end').value;
    const category = document.getElementById('category').value;
    const priority = document.getElementById('priority').value;

    let filteredTasks = tasks.filter(task => {
        if (dueDateStart && task.dueDate && new Date(task.dueDate) < new Date(dueDateStart)) return false;
        if (dueDateEnd && task.dueDate && new Date(task.dueDate) > new Date(dueDateEnd)) return false;
        if (category && task.category && task.category.toLowerCase() !== category.toLowerCase()) return false;
        if (priority && priority !== 'all' && task.priority !== priority) return false;
        return true;
    });

    if (sortBy && sortBy !== 'custom') {
        switch (sortBy) {
            case 'dueDate':
                filteredTasks.sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'alphabetical':
                filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'priority':
                const priorityOrder = {
                    'high': 1,
                    'medium': 2,
                    'low': 3
                };
                filteredTasks.sort((a, b) => {
                    if (!a.priority) return 1;
                    if (!b.priority) return -1;
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
                break;
            case 'lastUpdated':
                filteredTasks.sort((a, b) => {
                    if (!a.lastUpdated) return 1;
                    if (!b.lastUpdated) return -1;
                    return b.lastUpdated - a.lastUpdated;
                });
                break;
        }
    }
    closeSortFilterDialog();
    renderTasks(filteredTasks);

}



function searchTasks(searchTerm) {
    const results = tasks.filter(task => {
        // Exact Todo
        if (task.title.toLowerCase() === searchTerm.toLowerCase()) return true;

        // Sub-tasks
        if (task.subtasks && task.subtasks.some(subtask => subtask.title.toLowerCase().includes(searchTerm.toLowerCase()))) return true;

        // Similar Words (using a simple method, you might want to use a more sophisticated algorithm)
        if (task.title.toLowerCase().includes(searchTerm.toLowerCase())) return true;

        // Partial Search
        if (task.title.toLowerCase().split(' ').some(word => word.startsWith(searchTerm.toLowerCase()))) return true;
        // Tags
        if (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) return true;

        return false;
    });

    renderTasks(results);
}

function renderTasks(tasksToRender = tasks) {
    listContainer.innerHTML = '';
    tasksToRender.forEach((task, index) => {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        li.innerHTML = `
            <div class="task-content">
                <span class="checkbox"></span>
                <span class="task-title">${task.title}</span>
                <img src="images/delete.svg" class="delete-icon" alt="Delete">
            </div>
        `;
        if (task.completed) li.classList.add('checked');
        li.draggable = true;

        const taskContent = li.querySelector('.task-content');
        const checkbox = li.querySelector('.checkbox');

        checkbox.onclick = (e) => {
            e.stopPropagation();
            toggleTask(task.id);
        };

        taskContent.onclick = (e) => {
            if (e.target.classList.contains('delete-icon')) {
                deleteTask(task.id);
            } else if (e.target !== checkbox) {

                openAddTaskModal(task.id);
            }
        };

        if (task.subtasks && task.subtasks.length > 0) {
            const subtasksList = document.createElement('ul');
            subtasksList.classList.add('subtasks');
            task.subtasks.forEach((subtask, subIndex) => {
                const subLi = document.createElement('li');
                subLi.innerHTML = `
                    <span class="checkbox"></span>
                    <span class="subtask-title">${subtask.title}</span>
                    <img src="images/delete.svg" class="delete-icon" alt="Delete">
                `;
                if (subtask.completed) subLi.classList.add('checked');
                const subCheckbox = subLi.querySelector('.checkbox');
                subCheckbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubtask(task.id, subIndex);
                };
                subLi.onclick = (e) => {
                    if (e.target.classList.contains('delete-icon')) {
                        deleteSubtask(task.id, subIndex);
                    } else if (e.target !== subCheckbox) {
                        editSubtask(task.id, subIndex);
                    }
                };
                subLi.draggable = true;
                subtasksList.appendChild(subLi);
            });
            li.appendChild(subtasksList);
        }

        listContainer.appendChild(li);
    });

    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            searchTasks(searchTerm);
        } else {
            renderTasks();
        }
    });




    // Initialize drag and drop
    new Sortable(listContainer, {
        animation: 150,
        onEnd: function (evt) {
            const item = tasks.splice(evt.oldIndex, 1)[0];
            tasks.splice(evt.newIndex, 0, item);
            saveToLocalStorage();
        }
    });

    document.querySelectorAll('.subtasks').forEach(subtaskList => {
        new Sortable(subtaskList, {
            animation: 150,
            group: 'subtasks',
            onEnd: function (evt) {
                const taskId = evt.from.closest('li').dataset.taskId;
                const taskIndex = tasks.findIndex(task => task.id === parseInt(taskId));
                const subtask = tasks[taskIndex].subtasks.splice(evt.oldIndex, 1)[0];
                tasks[taskIndex].subtasks.splice(evt.newIndex, 0, subtask);
                saveToLocalStorage();
            }
        });
    });
}

function toggleTask(taskId) {
    const index = tasks.findIndex(task => task.id === taskId);
    tasks[index].completed = !tasks[index].completed;
    saveToLocalStorage();
    renderTasks();
}

function toggleSubtask(taskId, subtaskIndex) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    tasks[taskIndex].subtasks[subtaskIndex].completed = !tasks[taskIndex].subtasks[subtaskIndex].completed;
    saveToLocalStorage();
    renderTasks();
}

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    renderTasks();
}

function deleteSubtask(taskId, subtaskIndex) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
    saveToLocalStorage();
    renderTasks();
}

const closeTaskModalBtn = document.getElementById('close-task-modal');
const closeSubtaskModalBtn = document.getElementById('close-subtask-modal');

function openAddTaskModal(taskId = null) {
    closeAddSubtaskModal();
    taskModal.style.display = 'block';

    currentTaskId = taskId;
    currentSubtaskIndex = -1;

    if (taskId) {
        const task = tasks.find(task => task.id === taskId);
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-tags').value = task.tags.join(', ');
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-due-date').value = task.dueDate;
        renderSubtasks(task.subtasks || []);
    } else {
        document.getElementById('task-title').value = '';
        document.getElementById('task-tags').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-category').value = '';
        document.getElementById('task-due-date').value = '';
        subtasksList.innerHTML = '';
    }
}

function closeAddTaskModal() {
    taskModal.style.display = 'none';
}

function openAddSubtaskModal() {
    subtaskModal.style.display = 'block';
    if (currentSubtaskIndex === -1) {
        document.getElementById('subtask-title').value = '';

        document.getElementById('subtask-priority').value = 'medium';

        document.getElementById('subtask-due-date').value = '';
    }
}

function checkDueDates() {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
    let notifications = [];

    tasks.forEach(task => {
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (dueDate > today && dueDate <= threeDaysFromNow) {
                notifications.push(`Task due soon: ${task.title} (Due on ${task.dueDate})`);
            }
        }

        if (task.subtasks) {
            task.subtasks.forEach(subtask => {
                if (subtask.dueDate) {
                    const dueDate = new Date(subtask.dueDate);
                    if (dueDate > today && dueDate <= threeDaysFromNow) {
                        notifications.push(`Subtask due soon: ${subtask.title} (Due on ${subtask.dueDate})`);
                    }
                }
            });
        }
    });

    if (notifications.length > 0) {
        showNotification('Upcoming Due Dates', notifications.join('<br>'));
    }
}

let notificationTimeout;

function showNotification(title, body) {
    console.log('showing notification');
    const container = document.getElementById('notification-container');
    const content = document.getElementById('notification-content');
    const closeButton = document.getElementById('close-notification');

    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    content.innerHTML = `<h4>${title}</h4><p>${body}</p>`;
    container.style.display = 'block';
    container.style.opacity = '1';

    closeButton.onclick = () => {
        closeNotification();
    };

    // Automatically hide the notification after 30 seconds
    notificationTimeout = setTimeout(() => {
        closeNotification();
    }, 30000);
}

function closeNotification() {
    const container = document.getElementById('notification-container');
    container.style.opacity = '0';
    setTimeout(() => {
        container.style.display = 'none';
    }, 300); // Wait for the fade-out transition to complete
}

document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    checkDueDates();
});

function closeAddSubtaskModal() {
    subtaskModal.style.display = 'none';
    currentSubtaskIndex = -1;
}

function renderSubtasks(subtasks) {
    subtasksList.innerHTML = '';
    subtasks.forEach((subtask, index) => {
        renderSubtask(subtask);
    });
}

function editSubtask(taskId, subtaskIndex) {
    currentTaskId = taskId;
    currentSubtaskIndex = subtaskIndex;
    const task = tasks.find(task => task.id === taskId);
    const subtask = task.subtasks[subtaskIndex];
    document.getElementById('subtask-title').value = subtask.title;
    document.getElementById('subtask-priority').value = subtask.priority || 'medium';
    document.getElementById('subtask-due-date').value = subtask.dueDate || '';
    openAddSubtaskModal();
}

function saveTask() {
    const title = document.getElementById('task-title').value;
    const tags = document.getElementById('task-tags').value.split(',').map(tag => tag.trim());
    const priority = document.getElementById('task-priority').value;
    const category = document.getElementById('task-category').value;
    const dueDate = document.getElementById('task-due-date').value;

    const subtasks = Array.from(subtasksList.children).map(div => ({
        title: div.querySelector('.subtask-title').textContent,
        priority: div.querySelector('.subtask-priority').textContent,
        dueDate: div.querySelector('.subtask-due-date').textContent,
        completed: false
    }));

    const newTask = {
        id: currentTaskId || Date.now(),
        title,
        tags,
        priority,
        category,
        dueDate,
        subtasks,
        completed: false
    };

    if (currentTaskId) {
        const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = newTask;
        }
    } else {
        tasks.push(newTask);
    }

    saveToLocalStorage();
    closeAddTaskModal();
    renderTasks();
}

function saveSubtask() {
    const title = document.getElementById('subtask-title').value;
    const priority = document.getElementById('subtask-priority').value;
    const dueDate = document.getElementById('subtask-due-date').value;

    const newSubtask = {
        title,
        priority,
        dueDate,
        completed: false
    };

    if (currentTaskId) {
        const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
        if (currentSubtaskIndex > -1) {
            // Editing existing subtask
            tasks[taskIndex].subtasks[currentSubtaskIndex] = newSubtask;
        } else {
            // Adding new subtask
            tasks[taskIndex].subtasks.push(newSubtask);
        }

        saveToLocalStorage();
        closeAddSubtaskModal();
        openAddTaskModal(currentTaskId);

    } else {
        // This is for when we're adding a new task and its subtasks
        renderSubtask(newSubtask);
    }
}

function renderSubtask(subtask) {
    const subtaskElement = document.createElement('div');
    subtaskElement.classList.add('subtask');
    subtaskElement.innerHTML = `
     
        <span class="subtask-title">${subtask.title}</span>
        <span class="subtask-priority">${subtask.priority}</span>
        <span class="subtask-due-date">${subtask.dueDate}</span>
        
    `;
    subtasksList.appendChild(subtaskElement);
}

menuIcon.addEventListener('click', openSortFilterDialog);
applyButton.addEventListener('click', applySortAndFilter);
cancelButton.addEventListener('click', closeSortFilterDialog);

addButton.onclick = () => openAddTaskModal();
saveTaskButton.onclick = saveTask;
addSubtaskButton.onclick = openAddSubtaskModal;
saveSubtaskButton.onclick = saveSubtask;
closeTaskModalBtn.onclick = closeAddTaskModal;
closeSubtaskModalBtn.onclick = closeAddSubtaskModal;

window.onclick = (event) => {
    if (event.target == taskModal) {
        closeAddTaskModal();
    }
    if (event.target == subtaskModal) {
        closeAddSubtaskModal();
    }
};

checkDueDates();
renderTasks();