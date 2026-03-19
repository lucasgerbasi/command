Modules.tasks = {
  data: [],

  async render(container) {
    this.data = await window.api.getData('tasks').catch(() => []) || [];
    container.innerHTML = `
      <div class="mod-head">
        <div>
          <div class="mod-title">Tasks</div>
          <div class="mod-sub">Track what needs doing. Drag to reorder.</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="tasks-clear-done">Clear Completed</button>
          <button class="btn btn-gold" id="tasks-add-group">+ New Group</button>
        </div>
      </div>

      <div class="tasks-add-row">
        <input class="input flex-1" id="task-input" placeholder="What needs to be done? (Enter to add)" />
      </div>

      <div class="task-list" id="task-list"></div>
    `;

    this.renderList();

    const inp = document.getElementById('task-input');
    inp.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && inp.value.trim()) {
        this.data.unshift({
          id: Utils.uid(),
          text: inp.value.trim(),
          done: false,
          priority: 'none'
        });
        await this.save();
        inp.value = '';
        this.renderList();
      }
    });

    document.getElementById('tasks-clear-done').addEventListener('click', async () => {
      if (await App.confirm('Clear all completed tasks?')) {
        this.data = this.data.filter(t => !t.done);
        await this.save();
        this.renderList();
      }
    });

    document.getElementById('tasks-add-group').addEventListener('click', () => {
      const name = prompt('Group name:');
      if (name) {
        this.data.unshift({
          id: Utils.uid(),
          isGroup: true,
          name: name.trim(),
          items: []
        });
        this.save().then(() => this.renderList());
      }
    });
  },

  renderList() {
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    if (this.data.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">✓</div>
        <div class="empty-text">All caught up</div>
      </div>`;
      return;
    }

    this.data.forEach((item, index) => {
      if (item.isGroup) {
        const grp = document.createElement('div');
        grp.className = 'task-group';
        grp.dataset.index = index;

        const activeCount = item.items.filter(i => !i.done).length;

        grp.innerHTML = `
          <div class="task-group-header" draggable="true" data-index="${index}">
            <span class="drag-handle" style="margin-right:2px;font-size:10px">⠿</span>
            <span class="task-group-toggle">${item.collapsed ? '▶' : '▼'}</span>
            <span class="task-group-name">${item.name}</span>
            ${activeCount > 0 ? `<span class="task-group-count">${activeCount}</span>` : ''}
            <button class="btn-icon task-group-delete danger" title="Delete Group">✕</button>
          </div>
          <div class="task-group-body" style="display:${item.collapsed ? 'none' : 'block'}" data-group-index="${index}">
             <div style="padding:4px 0 8px">
               <input class="input task-group-input" style="padding:6px 10px;font-size:12px;width:100%" placeholder="Add task to ${item.name}..." />
             </div>
             <div class="group-items-list"></div>
          </div>
        `;

        const groupList = grp.querySelector('.group-items-list');
        item.items.forEach((subItem, subIndex) => {
          groupList.appendChild(this.createTaskElement(subItem, index, subIndex));
        });

        // Toggle collapse
        grp.querySelector('.task-group-header').addEventListener('click', async (e) => {
          if (e.target.closest('.task-group-delete') || e.target.closest('.drag-handle')) return;
          item.collapsed = !item.collapsed;
          await this.save();
          this.renderList();
        });

        // Delete group
        grp.querySelector('.task-group-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (await App.confirm(`Delete group "${item.name}" and all its tasks?`, { danger: true })) {
            this.data.splice(index, 1);
            await this.save();
            this.renderList();
          }
        });

        // Add sub-task
        const subInput = grp.querySelector('.task-group-input');
        subInput.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter' && subInput.value.trim()) {
            item.items.unshift({ id: Utils.uid(), text: subInput.value.trim(), done: false, priority: 'none' });
            await this.save();
            this.renderList();
          }
        });

        list.appendChild(grp);

      } else {
        list.appendChild(this.createTaskElement(item, null, index));
      }
    });

    this.setupDragAndDrop();
  },

  createTaskElement(task, groupIndex, itemIndex) {
    const el = document.createElement('div');
    el.className = `task-item priority-${task.priority || 'none'} ${task.done ? 'done' : ''}`;
    el.draggable = true;
    el.dataset.id = task.id;
    if (groupIndex !== null) {
      el.dataset.group = groupIndex;
      el.dataset.index = itemIndex;
    } else {
      el.dataset.index = itemIndex;
    }

    el.innerHTML = `
      <span class="drag-handle">⠿</span>
      <button class="task-check" title="Toggle Done">✓</button>
      <span class="task-text">${task.text}</span>
      <div class="task-actions">
        <select class="input task-priority-select" title="Priority">
          <option value="none" ${task.priority === 'none' ? 'selected' : ''}>—</option>
          <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Med</option>
          <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
        </select>
        <button class="btn-icon danger task-delete" title="Delete">✕</button>
      </div>
    `;

    // Toggle Check
    el.querySelector('.task-check').addEventListener('click', async () => {
      task.done = !task.done;
      await this.save();
      this.renderList();
    });

    // Delete Task
    el.querySelector('.task-delete').addEventListener('click', async () => {
      if (groupIndex !== null) {
        this.data[groupIndex].items.splice(itemIndex, 1);
      } else {
        this.data.splice(itemIndex, 1);
      }
      await this.save();
      this.renderList();
    });

    // Priority Change
    el.querySelector('.task-priority-select').addEventListener('change', async (e) => {
      task.priority = e.target.value;
      await this.save();
      this.renderList();
    });

    return el;
  },

  setupDragAndDrop() {
    const list = document.getElementById('task-list');
    let draggedEl = null;
    let draggedData = null;
    let dragSourceGroupIndex = null;
    let dragSourceItemIndex = null;

    // Handle both `.task-item` and `.task-group-header`
    const itemsAndGroups = list.querySelectorAll('.task-item, .task-group-header');

    itemsAndGroups.forEach(el => {
      el.addEventListener('dragstart', (e) => {
        draggedEl = el;
        e.dataTransfer.effectAllowed = 'move';

        if (el.classList.contains('task-item')) {
          dragSourceGroupIndex = el.dataset.group !== undefined ? parseInt(el.dataset.group) : null;
          dragSourceItemIndex = parseInt(el.dataset.index);
          if (dragSourceGroupIndex !== null) {
            draggedData = this.data[dragSourceGroupIndex].items[dragSourceItemIndex];
          } else {
            draggedData = this.data[dragSourceItemIndex];
          }
          App.setDragGhost(e, draggedData.text);
        } else if (el.classList.contains('task-group-header')) {
          dragSourceGroupIndex = null;
          dragSourceItemIndex = parseInt(el.dataset.index);
          draggedData = this.data[dragSourceItemIndex];
          App.setDragGhost(e, draggedData.name);
          // Drag the whole group visually
          draggedEl = el.closest('.task-group');
        }
        
        setTimeout(() => draggedEl.classList.add('dragging'), 0);
      });

      el.addEventListener('dragend', async () => {
        if (draggedEl) draggedEl.classList.remove('dragging');
        draggedEl = null;

        // Rebuild data array from current DOM order to persist changes natively
        const newData = [];
        list.childNodes.forEach(node => {
          if (node.classList && node.classList.contains('task-item')) {
            const gid = node.dataset.group !== undefined ? parseInt(node.dataset.group) : null;
            const idx = parseInt(node.dataset.index);
            newData.push(gid !== null ? this.data[gid].items[idx] : this.data[idx]);
          } else if (node.classList && node.classList.contains('task-group')) {
            const gIdx = parseInt(node.dataset.index);
            const groupData = this.data[gIdx];
            
            // Rebuild items within group
            const newGroupItems = [];
            node.querySelectorAll('.task-item').forEach(subNode => {
              const sgid = subNode.dataset.group !== undefined ? parseInt(subNode.dataset.group) : null;
              const sidx = parseInt(subNode.dataset.index);
              newGroupItems.push(sgid !== null ? this.data[sgid].items[sidx] : this.data[sidx]);
            });
            groupData.items = newGroupItems;
            newData.push(groupData);
          }
        });

        this.data = newData;
        await this.save();
        this.renderList(); // Re-render to fix all dataset index attributes
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedEl || draggedEl === el) return;
        
        // Prevent groups from being dropped inside other groups
        if (draggedEl.classList.contains('task-group') && el.classList.contains('task-item') && el.closest('.task-group')) {
           return; 
        }

        // Live DOM shifting for ghost preview
        const parentList = el.parentNode;
        const siblings = [...parentList.children];
        const draggedIdx = siblings.indexOf(draggedEl);
        
        // Determine what `el` is relative to its container to figure out insertion
        let targetNode = el;
        // If we are dragging a group, target the whole group container if hovering over its header
        if (draggedEl.classList.contains('task-group') && targetNode.classList.contains('task-group-header')) {
            targetNode = targetNode.closest('.task-group');
        }

        const targetIdx = siblings.indexOf(targetNode);

        // If targetIdx is -1, it means we are dragging across different levels (e.g. root to group)
        if (targetIdx !== -1 && draggedIdx !== -1) {
            if (draggedIdx < targetIdx) {
              parentList.insertBefore(draggedEl, targetNode.nextSibling);
            } else {
              parentList.insertBefore(draggedEl, targetNode);
            }
        } else {
            // Dragging between groups or into a group from root
            if (parentList.classList.contains('group-items-list') && !draggedEl.classList.contains('task-group')) {
                // Ensure we don't accidentally insert a group inside a group
                parentList.insertBefore(draggedEl, targetNode);
            }
        }
      });
      
      el.addEventListener('drop', e => e.preventDefault()); // Handled by dragend
    });

    // Handle dropping items into empty groups or at the end of lists
    const groupLists = list.querySelectorAll('.group-items-list');
    groupLists.forEach(gList => {
       gList.addEventListener('dragover', (e) => {
           e.preventDefault();
           // Only append if list is empty or hovering below the last item
           if (draggedEl && !draggedEl.classList.contains('task-group') && draggedEl.parentNode !== gList) {
               gList.appendChild(draggedEl);
           }
       });
    });
  },

  async save() {
    await window.api.setData('tasks', this.data);
  }
};