export interface TestItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface UpdateTestItemRequest {
  id: string;
  completed: boolean;
}
