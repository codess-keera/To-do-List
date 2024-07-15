database schema:-

task:-
Index: int
category: string
completed: boolean
dueDate: string
id: string
priority: "medium" || "low" || "high"
tags: [string]
title: int
subtasks= [subtask]


subtask:-
Index: int
dueDate: string
title: string
priority: "medium" || "low" || "high"
