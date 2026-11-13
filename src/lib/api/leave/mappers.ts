import type { CreateLeaveRequestInput, LeaveAllowance, LeaveRequest } from '@/lib/api/leave/types';
import type { ApiError } from '@/types/api-error';
import type { Database } from '@/types';
import content from './content.json';

type LeaveRequestRow = Pick<
  Database['public']['Tables']['leave_requests']['Row'],
  'id' | 'leave_type' | 'start_date' | 'end_date' | 'note' | 'status'
>;
type LeaveRequestInsertRow = Database['public']['Tables']['leave_requests']['Insert'];
type LeaveAllowanceRow = Pick<Database['public']['Tables']['leave_allowances']['Row'], 'id' | 'year' | 'leave_type' | 'days'>;

export const LEAVE_REQUEST_COLUMNS = 'id, leave_type, start_date, end_date, note, status';

export const LEAVE_ALLOWANCE_COLUMNS = 'id, year, leave_type, days';

export function mapLeaveRequestRowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
    status: row.status
  };
}

export function mapLeaveAllowanceRowToLeaveAllowance(row: LeaveAllowanceRow): LeaveAllowance {
  return {
    id: row.id,
    year: row.year,
    leaveType: row.leave_type,
    days: row.days
  };
}

export function mapCreateLeaveRequestInputToRow(input: CreateLeaveRequestInput): LeaveRequestInsertRow {
  return {
    leave_type: input.leaveType,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note
  };
}

// turns database rule violations into messages a person can act on
export function mapLeaveErrorToApiError(error: LeaveDatabaseError, statusCode: number): ApiError {
  return {
    message: getLeaveErrorMessage(error),
    statusCode
  };
}

function getLeaveErrorMessage(error: LeaveDatabaseError): string {
  switch (error.code) {
    case '23P01':
      return content.errors.overlap;
    case '23514':
      return error.message.includes('working day') ? content.errors.noWorkingDays : content.errors.invalidRequest;
    case '42501':
      return content.errors.notAllowed;
    case 'PGRST116':
      return content.errors.cannotCancel;
    default:
      return content.errors.unexpected;
  }
}

export interface LeaveDatabaseError {
  code: string;
  message: string;
}
