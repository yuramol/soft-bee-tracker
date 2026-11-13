'use client';

import { CheckIcon, PauseIcon, PlayIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { FinishLiveTrackerDialog } from '@components/tracker/live-tracker/finish-live-tracker-dialog';
import { StartLiveTrackerDialog } from '@components/tracker/live-tracker/start-live-tracker-dialog';
import { Button } from '@ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';
import { useNow } from '@/hooks/use-now';
import { useProjects } from '@/lib/api/projects';
import { useActiveLiveTracker, useDiscardLiveTracker, usePauseLiveTracker, useResumeLiveTracker } from '@/lib/api/trackers';
import type { Tracker } from '@/lib/api/trackers';
import { formatDuration } from '@/lib/format-duration';
import { formatStopwatch, formatTimerLabel, getLiveElapsedSeconds } from '@/lib/live-tracker';
import { formatText } from '@/lib/format-text';
import content from '../content.json';

export function LiveTrackerWidget() {
  const { data: tracker, isLoading, isError } = useActiveLiveTracker();

  if (isLoading || isError) {
    return null;
  }

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 fixed right-4 bottom-4 z-40 duration-300'>
      {tracker ? <ActiveTimer tracker={tracker} /> : <StartLiveTrackerDialog />}
    </div>
  );
}

function ActiveTimer({ tracker }: { tracker: Tracker }) {
  const isRunning = tracker.liveStatus === 'start';
  const now = useNow(isRunning);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [finishOpenedAt, setFinishOpenedAt] = useState(0);
  const { data: projects = [] } = useProjects();
  const pauseTracker = usePauseLiveTracker();
  const resumeTracker = useResumeLiveTracker();
  const discardTracker = useDiscardLiveTracker();
  const isBusy = pauseTracker.isPending || resumeTracker.isPending || discardTracker.isPending;
  const projectName = projects.find((project) => project.id === tracker.projectId)?.name ?? content.fallbackProjectName;
  const elapsedSeconds = getLiveElapsedSeconds(tracker, now);

  function handlePauseResumeClick() {
    if (isRunning) {
      pauseTracker.mutate(tracker);
    } else {
      resumeTracker.mutate(tracker);
    }
  }

  function handleStopClick() {
    setFinishOpenedAt(Date.now());
    setIsFinishOpen(true);
  }

  function handleDiscardClick() {
    setIsDiscardOpen(true);
  }

  function handleDiscardConfirm() {
    discardTracker.mutate(tracker, { onSuccess: handleDiscarded });
  }

  function handleDiscarded() {
    setIsDiscardOpen(false);
  }

  return (
    <section
      aria-label={content.liveWidget.label}
      className='bg-popover text-popover-foreground ring-foreground/10 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl px-2 py-1 shadow-lg ring-1'
    >
      <Button
        variant='ghost'
        size='icon-lg'
        aria-label={isRunning ? content.liveWidget.pause : content.liveWidget.resume}
        disabled={isBusy}
        className='text-deep-teal dark:text-electric-green rounded-xl'
        onClick={handlePauseResumeClick}
      >
        {isRunning ? <PauseIcon className='size-5 fill-current' /> : <PlayIcon className='size-5 fill-current' />}
      </Button>

      <div className='flex min-w-0 items-center gap-3 px-1'>
        <span className='flex min-w-0 items-center gap-2'>
          <span
            aria-hidden
            data-running={isRunning}
            className='bg-muted-foreground/40 data-[running=true]:bg-success size-2 shrink-0 rounded-full data-[running=true]:animate-pulse'
          />
          <span className='max-w-40 truncate font-semibold sm:max-w-56' title={tracker.description ?? projectName}>
            {projectName}
          </span>
        </span>
        <span
          role='timer'
          aria-label={isRunning ? content.liveWidget.elapsed : content.liveWidget.pausedAt}
          title={formatStopwatch(elapsedSeconds)}
          data-running={isRunning}
          className='text-muted-foreground data-[running=true]:text-foreground shrink-0 tabular-nums'
        >
          {formatTimerLabel(elapsedSeconds)}
        </span>
      </div>

      <div className='flex items-center'>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant='ghost'
                size='icon-lg'
                aria-label={content.liveWidget.stopAndSave}
                disabled={isBusy}
                className='text-deep-teal dark:text-electric-green rounded-xl'
                onClick={handleStopClick}
              />
            }
          >
            <CheckIcon className='size-5' />
          </TooltipTrigger>
          <TooltipContent>{content.liveWidget.stopAndSave}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant='ghost'
                size='icon-lg'
                aria-label={content.liveWidget.discardLabel}
                disabled={isBusy}
                className='text-destructive hover:text-destructive rounded-xl'
                onClick={handleDiscardClick}
              />
            }
          >
            <XIcon className='size-5' />
          </TooltipTrigger>
          <TooltipContent>{content.liveWidget.discardTooltip}</TooltipContent>
        </Tooltip>
      </div>

      {finishOpenedAt > 0 ? (
        <FinishLiveTrackerDialog key={finishOpenedAt} tracker={tracker} open={isFinishOpen} onOpenChange={setIsFinishOpen} />
      ) : null}

      <ConfirmDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        title={content.liveWidget.discardDialog.title}
        description={
          tracker.durationMinutes > 0
            ? formatText(content.liveWidget.discardDialog.resumedDescription, { duration: formatDuration(tracker.durationMinutes) })
            : formatText(content.liveWidget.discardDialog.newDescription, {
                duration: formatTimerLabel(elapsedSeconds),
                project: projectName
              })
        }
        confirmLabel={content.liveWidget.discardDialog.confirmButton}
        isDestructive
        isBusy={discardTracker.isPending}
        onConfirm={handleDiscardConfirm}
      />
    </section>
  );
}
