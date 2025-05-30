const generateProcessesBtn = document.getElementById('generateProcessesBtn');
  const processInputsContainer = document.getElementById('processInputs');
  const numProcessesInput = document.getElementById('numProcesses');
  const algorithmSelect = document.getElementById('algorithmSelect');
  const quantumInput = document.getElementById('quantumInput');
  const quantumInputContainer = document.getElementById('roundRobinQuantumContainer');
  const resultsDiv = document.getElementById('results');
  const ganttChartDiv = document.getElementById('ganttChart');
  const simulatorForm = document.getElementById('simulatorForm');
  const resetBtn = document.getElementById('resetBtn');

  // Show/hide quantum input for Round Robin
  algorithmSelect.addEventListener('change', () => {
    if (algorithmSelect.value === 'round-robin') {
      quantumInputContainer.style.display = 'block';
      quantumInput.required = true;
    } else {
      quantumInputContainer.style.display = 'none';
      quantumInput.required = false;
    }
  });

  generateProcessesBtn.addEventListener('click', () => {
    let n = parseInt(numProcessesInput.value);
    if (isNaN(n) || n < 1 || n > 15) {
      alert('Please enter number of processes between 1 and 15.');
      return;
    }
    generateProcessInputs(n);
  });

  resetBtn.addEventListener('click', () => {
    simulatorForm.reset();
    processInputsContainer.innerHTML = '';
    resultsDiv.innerHTML = '';
    ganttChartDiv.innerHTML = '';
    quantumInputContainer.style.display = 'none';
  });

  simulatorForm.addEventListener('submit', e => {
    e.preventDefault();
    resultsDiv.innerHTML = '';
    ganttChartDiv.innerHTML = '';

    let processes = readProcessesFromInputs();
    if (!processes) return;

    let selectedAlgorithm = algorithmSelect.value;
    if (!selectedAlgorithm) {
      alert('Please select a scheduling algorithm.');
      return;
    }

    let quantum = parseInt(quantumInput.value);
    if (selectedAlgorithm === 'round-robin' && (isNaN(quantum) || quantum <= 0)) {
      alert('Please enter a valid quantum time (positive integer).');
      return;
    }

    // Sort processes by arrival time for most algorithms
    processes.sort((a,b) => a.arrivalTime - b.arrivalTime);

    let simulationResult;
    switch(selectedAlgorithm) {
      case 'fcfs':
        simulationResult = fcfs(processes);
        break;
      case 'sjf-non-preemptive':
        simulationResult = sjfNonPreemptive(processes);
        break;
      case 'sjf-preemptive':
        simulationResult = sjfPreemptive(processes);
        break;
      case 'priority-non-preemptive':
        simulationResult = priorityNonPreemptive(processes);
        break;
      case 'priority-preemptive':
        simulationResult = priorityPreemptive(processes);
        break;
      case 'round-robin':
        simulationResult = roundRobin(processes, quantum);
        break;
      default:
        alert('Algorithm not implemented!');
        return;
    }

    displayResults(simulationResult);
    drawGanttChart(simulationResult.ganttChart, simulationResult.timeline);
  });

  function generateProcessInputs(n) {
    processInputsContainer.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const div = document.createElement('div');
      div.className = 'process-row';
      div.innerHTML = `
        <strong>Process P${i+1}</strong>
        <label>Burst Time:</label>
        <input type="number" min="1" required class="burstTime" data-index="${i}" />
        <label>Arrival Time:</label>
        <input type="number" min="0" required class="arrivalTime" value="0" data-index="${i}" />
        <label>Priority:</label>
        <input type="number" min="1" required class="priority" value="1" data-index="${i}" />
      `;
      processInputsContainer.appendChild(div);
    }
  }

  function readProcessesFromInputs() {
    let burstTimes = [...document.querySelectorAll('.burstTime')];
    let arrivalTimes = [...document.querySelectorAll('.arrivalTime')];
    let priorities = [...document.querySelectorAll('.priority')];

    if (burstTimes.length === 0) {
      alert('Please generate and input processes first.');
      return null;
    }
    let processes = [];

    for (let i = 0; i < burstTimes.length; i++) {
  let b = Number(burstTimes[i].value);
  let a = Number(arrivalTimes[i].value);
  let p = Number(priorities[i].value);
  if (isNaN(b) || b <= 0 || isNaN(a) || a < 0 || isNaN(p) || p < 1) 
    {
    alert(`Please enter valid positive integers for Burst Time, Arrival Time (≥0), and Priority (≥1) for Process P${i+1}`);
    return null;
    }
  processes.push({
    id: ` P${i+1} `,
    burstTime: b,
    arrivalTime: a,
    priority: p,
  });
}
    return processes;
  }

  // Scheduling algorithms below
  // Return format from all: { ganttChart: [processId], timeline: [time], waitingTimes: {...}, turnaroundTimes: {...}, avgWaitingTime, avgTurnaroundTime }
  
  function fcfs(processes) {
    let ganttChart = [];
    let timeline = [];
    let currentTime = 0;
    let waitingTimes = {};
    let turnaroundTimes = {};

    for (let proc of processes) {
      if (currentTime < proc.arrivalTime) currentTime = proc.arrivalTime;
      ganttChart.push(proc.id);
      timeline.push(currentTime);
      waitingTimes[proc.id] = currentTime - proc.arrivalTime;
      currentTime += proc.burstTime;
      turnaroundTimes[proc.id] = currentTime - proc.arrivalTime;
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));

    return {ganttChart, timeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime};
  }

  function sjfNonPreemptive(processes) {
    let n = processes.length;
    let completed = 0;
    let currentTime = 0;
    let waitingTimes = {};
    let turnaroundTimes = {};
    let ganttChart = [];
    let timeline = [];

    let isCompleted = new Array(n).fill(false);

    while(completed < n) {
      // find process with min burst time among arrived and not completed
      let idx = -1;
      let minBurst = Infinity;
      for(let i=0; i<n; i++){
        if(!isCompleted[i] && processes[i].arrivalTime <= currentTime){
          if(processes[i].burstTime < minBurst){
            minBurst = processes[i].burstTime;
            idx = i;
          } else if (processes[i].burstTime === minBurst) {
            // tie breaker: earlier arrival time
            if(processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
          }
        }
      }
      if(idx === -1) {
        currentTime++;
        continue;
      }

      ganttChart.push(processes[idx].id);
      timeline.push(currentTime);
      waitingTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
      currentTime += processes[idx].burstTime;
      turnaroundTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
      isCompleted[idx] = true;
      completed++;
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));

    return {ganttChart, timeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime}
  }

  function sjfPreemptive(processes) {
    let n = processes.length;
    let completed = 0;
    let currentTime = 0;
    let remainingTime = processes.map(p => p.burstTime);
    let waitingTimes = {};
    let turnaroundTimes = {};
    let ganttChart = [];
    let timeline = [];

    let prevProcess = null;

    let isCompleted = new Array(n).fill(false);

    while(completed < n) {
      // find process with min remaining time among arrived and not completed
      let idx = -1;
      let minRemaining = Infinity;
      for(let i=0; i<n; i++) {
        if(processes[i].arrivalTime <= currentTime && !isCompleted[i]) {
          if(remainingTime[i] < minRemaining && remainingTime[i] > 0) {
            minRemaining = remainingTime[i];
            idx = i;
          } else if (remainingTime[i] === minRemaining) {
            if(processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
          }
        }
      }

      if(idx === -1) {
        if(prevProcess !== null) {
          timeline.push(currentTime);
          prevProcess = null;
        }
        currentTime++;
        continue;
      }
      if(prevProcess !== idx) {
        ganttChart.push(idx !== -1 ? processes[idx].id : '');
        timeline.push(currentTime);
      }
      prevProcess = idx;

      remainingTime[idx]--;
      currentTime++;

      if(remainingTime[idx] === 0) {
        isCompleted[idx] = true;
        completed++;
        turnaroundTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
        waitingTimes[processes[idx].id] = turnaroundTimes[processes[idx].id] - processes[idx].burstTime;
      }
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));
    let cleanedGantt = [];
    let cleanedTimeline = [];
    // Merge consecutive same process in gantt chart for cleaner visualization
    if(ganttChart.length > 0) {
      cleanedGantt.push(ganttChart[0]);
      cleanedTimeline.push(timeline[0]);
      for(let i=1; i<ganttChart.length; i++) {
        if(ganttChart[i] !== cleanedGantt[cleanedGantt.length -1]) {
          cleanedGantt.push(ganttChart[i]);
          cleanedTimeline.push(timeline[i]);
        }
      }
      cleanedTimeline.push(timeline[timeline.length-1]);
    }

    return {ganttChart: cleanedGantt, timeline: cleanedTimeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime};
  }

  function priorityNonPreemptive(processes) {
    let n = processes.length;
    let completed = 0;
    let currentTime = 0;
    let waitingTimes = {};
    let turnaroundTimes = {};
    let ganttChart = [];
    let timeline = [];

    let isCompleted = new Array(n).fill(false);

    while(completed < n) {
      // find process with highest priority of arrived and not completed
      // lower priority number means higher priority
      let idx = -1;
      let highestPriority = Infinity;
      for(let i=0; i<n; i++){
        if(!isCompleted[i] && processes[i].arrivalTime <= currentTime){
          if(processes[i].priority < highestPriority){
            highestPriority = processes[i].priority;
            idx = i;
          } else if (processes[i].priority === highestPriority) {
            // tie breaker: arrival time
            if(processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
          }
        }
      }
      if(idx === -1) {
        currentTime++;
        continue;
      }

      ganttChart.push(processes[idx].id);
      timeline.push(currentTime);
      waitingTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
      currentTime += processes[idx].burstTime;
      turnaroundTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
      isCompleted[idx] = true;
      completed++;
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));

    return {ganttChart, timeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime};
  }

  function priorityPreemptive(processes) {
    let n = processes.length;
    let completed = 0;
    let currentTime = 0;
    let remainingTime = processes.map(p => p.burstTime);
    let waitingTimes = {};
    let turnaroundTimes = {};
    let ganttChart = [];
    let timeline = [];

    let prevProcess = null;

    let isCompleted = new Array(n).fill(false);

    while(completed < n) {
      // find process with highest priority (lowest p) among arrived and not completed
      let idx = -1;
      let highestPriority = Infinity;
      for(let i=0; i<n; i++) {
        if(processes[i].arrivalTime <= currentTime && !isCompleted[i]) {
          if(processes[i].priority < highestPriority && remainingTime[i] > 0) {
            highestPriority = processes[i].priority;
            idx = i;
          } else if (processes[i].priority === highestPriority) {
            if(processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
          }
        }
      }

      if(idx === -1) {
        if(prevProcess !== null) {
          timeline.push(currentTime);
          prevProcess = null;
        }
        currentTime++;
        continue;
      }
      if(prevProcess !== idx) {
        ganttChart.push(idx !== -1 ? processes[idx].id : '');
        timeline.push(currentTime);
      }
      prevProcess = idx;

      remainingTime[idx]--;
      currentTime++;

      if(remainingTime[idx] === 0) {
        isCompleted[idx] = true;
        completed++;
        turnaroundTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
        waitingTimes[processes[idx].id] = turnaroundTimes[processes[idx].id] - processes[idx].burstTime;
      }
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));

    let cleanedGantt = [];
    let cleanedTimeline = [];
    // Merge consecutive same process in gantt chart for cleaner visualization
    if(ganttChart.length > 0) {
      cleanedGantt.push(ganttChart[0]);
      cleanedTimeline.push(timeline[0]);
      for(let i=1; i<ganttChart.length; i++) {
        if(ganttChart[i] !== cleanedGantt[cleanedGantt.length -1]) {
          cleanedGantt.push(ganttChart[i]);
          cleanedTimeline.push(timeline[i]);
        }
      }
      cleanedTimeline.push(timeline[timeline.length-1]);
    }

    return {ganttChart: cleanedGantt, timeline: cleanedTimeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime};
  }

  function roundRobin(processes, quantum) {
    let n = processes.length;
    let queue = [];
    let currentTime = 0;
    let remainingTime = processes.map(p => p.burstTime);
    let completed = 0;
    let waitingTimes = {};
    let turnaroundTimes = {};
    let ganttChart = [];
    let timeline = [];

    let visited = new Array(n).fill(false);

    queue.push(0);
    visited[0] = true;
    timeline.push(0);

    while(completed < n) {
      if(queue.length === 0) {
        // If queue empty but some process arrived later, jump time
        for(let i=0; i<n; i++) {
          if(!visited[i] && processes[i].arrivalTime > currentTime) {
            currentTime = processes[i].arrivalTime;
            queue.push(i);
            visited[i] = true;
            timeline.push(currentTime);
            break;
          }
        }
        if(queue.length === 0) break; // all done
      }
      let idx = queue.shift();
      if(remainingTime[idx] > 0) {
        ganttChart.push(processes[idx].id);
        timeline.push(currentTime);

        let execTime = Math.min(quantum, remainingTime[idx]);
        remainingTime[idx] -= execTime;
        currentTime += execTime;

        // Enqueue newly arrived processes during execution
        for(let i=0; i<n; i++) {
          if(!visited[i] && processes[i].arrivalTime <= currentTime) {
            queue.push(i);
            visited[i] = true;
          }
        }
        // If process not finished, re-enqueue it
        if(remainingTime[idx] > 0) {
          queue.push(idx);
        } else {
          completed++;
          turnaroundTimes[processes[idx].id] = currentTime - processes[idx].arrivalTime;
          waitingTimes[processes[idx].id] = turnaroundTimes[processes[idx].id] - processes[idx].burstTime;
        }
      }
    }
    timeline.push(currentTime);

    let avgWaitingTime = average(Object.values(waitingTimes));
    let avgTurnaroundTime = average(Object.values(turnaroundTimes));

    return {ganttChart, timeline, waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime};
  }

  function average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a,b) => a+b, 0) / arr.length;
  }

    // Display functions
  function displayResults({waitingTimes, turnaroundTimes, avgWaitingTime, avgTurnaroundTime}) {
    let html = '<div class="info-box">';
    html += `<strong>Average Waiting Time:</strong> ${avgWaitingTime.toFixed(2)}<br>`;
    html += `<strong>Average Turnaround Time:</strong> ${avgTurnaroundTime.toFixed(2)}<br><br>`;
    html += '<table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse; margin:auto;">';
    html += '<thead><tr><th>Process</th><th>Waiting Time</th><th>Turnaround Time</th></tr></thead><tbody>';
    Object.keys(waitingTimes).forEach(pid => {
    html += `<tr><td>${pid}</td><td>${waitingTimes[pid]}</td><td>${turnaroundTimes[pid]}</td></tr>`;
    });
    html += '</tbody</table></div>';

    resultsDiv.innerHTML = html;

    }


    function drawGanttChart(ganttChart, timeline) {
    ganttChartDiv.innerHTML = '';
    if (ganttChart.length === 0) {
      ganttChartDiv.textContent = "No Gantt chart to display.";
      return;

    }


    // Calculate total time on timeline to scale bars


    const totalTime = timeline[timeline.length - 1] - timeline[0];
    let containerWidth = ganttChartDiv.clientWidth || 700;
    const pxPerUnit = Math.max(containerWidth / totalTime, 30);
    for(let i=0; i<ganttChart.length; i++) {
      let procId = ganttChart[i];
      let startTime = timeline[i];
      let endTime = timeline[i+1];
      let widthPx = (endTime - startTime) * pxPerUnit;
      let bar = document.createElement('div');
      bar.className = 'gantt-bar';
      bar.style.width = widthPx + 'px';
      bar.style.backgroundColor = stringToColor(procId);
      bar.textContent = procId;
      ganttChartDiv.appendChild(bar);
    }
    // Show time labels below bars
    let timeLabels = document.createElement('div');
    timeLabels.style.display = 'flex';
    timeLabels.style.justifyContent = 'flex-start';
    timeLabels.style.fontSize = '12px';
    timeLabels.style.color = '#555';

    for(let t of timeline){
        let label = document.createElement('div');
        label.className = 'gantt-time';
        label.style.width = 'auto';
        label.style.minWidth = '20px';
        label.style.marginRight = '2px';
        label.textContent = t;
        timeLabels.appendChild(label);
    }
    ganttChartDiv.appendChild(timeLabels);
  }

  function stringToColor(str) {
    if (!str) return '#888';
    let hash = 0;
    for (let i=0; i<str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i=0; i<3; i++) {
      let value = (hash >> (i * 8)) & 0xff;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }