export enum EntryReviewStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum Status {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
}

export type ProjectOption = string;

export const PROJECT_OPTIONS: ProjectOption[] = [
  'Production',
  'Formation',
  'Réunion',
  'Support',
  'Congés',
  'Autre',
];
