import React, { useCallback } from "react";
import {
  Button,
  Box,
  HStack,
  Spacer,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { debugMode } from "../constants";
import { useAppState } from "../state/store";
import RunTaskButton from "./RunTaskButton";
import VoiceButton from "./VoiceButton";
import TaskHistory from "./TaskHistory";
import TaskStatus from "./TaskStatus";
import RecommendedTasks from "./RecommendedTasks";
import AutosizeTextarea from "./AutosizeTextarea";

const injectContentScript = async () => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
  if (!tab || !tab.id) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["src/pages/contentInjected/index.js"],
    world: "MAIN",
  });
};

function ActionExecutor() {
  const state = useAppState((state) => ({
    attachDebugger: state.currentTask.actions.attachDebugger,
    detachDegugger: state.currentTask.actions.detachDebugger,
    performActionString: state.currentTask.actions.performActionString,
    prepareLabels: state.currentTask.actions.prepareLabels,
    showImagePrompt: state.currentTask.actions.showImagePrompt,
  }));
  return (
    <Box mt={4}>
      <HStack
        columnGap="0.5rem"
        rowGap="0.5rem"
        fontSize="md"
        borderTop="1px dashed gray"
        py="3"
        shouldWrapChildren
        wrap="wrap"
      >
        <Button onClick={state.attachDebugger}>Attach</Button>
        <Button onClick={state.prepareLabels}>Prepare</Button>
        <Button onClick={state.showImagePrompt}>Show Image</Button>
        <Button
          onClick={() => {
            injectContentScript();
          }}
        >
          Inject
        </Button>
      </HStack>
    </Box>
  );
}

const TaskUI = () => {
  const state = useAppState((state) => ({
    taskHistory: state.currentTask.history,
    taskStatus: state.currentTask.status,
    runTask: state.currentTask.actions.runTask,
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
    voiceMode: state.settings.voiceMode,
    isListening: state.currentTask.isListening,
  }));
  const taskInProgress = state.taskStatus === "running";

  const toast = useToast();

  const toastError = useCallback(
    (message: string) => {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
    [toast],
  );

  const runTask = useCallback(() => {
    state.instructions && state.runTask(toastError);
  }, [state, toastError]);

  const runTaskWithNewInstructions = (newInstructions: string = "") => {
    if (!newInstructions) {
      return;
    }
    state.setInstructions(newInstructions);
    state.runTask(toastError);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      runTask();
    }
  };

  return (
    <>
      <AutosizeTextarea
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        placeholder="Try telling Echo to do a task"
        value={state.instructions || ""}
        isDisabled={taskInProgress || state.isListening}
        onChange={(e) => state.setInstructions(e.target.value)}
        mb={2}
        onKeyDown={onKeyDown}
      />
      <HStack mt={2} mb={2}>
        <RunTaskButton runTask={runTask} />
        {state.voiceMode && (
          <VoiceButton
            taskInProgress={taskInProgress}
            onStopSpeaking={runTask}
          />
        )}
        <Spacer />
      </HStack>
      {state.voiceMode && (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <AlertDescription fontSize="sm" lineHeight="5">
            In Voice Mode, you can press Space to start speaking and Space again
            to stop. Echo will run the task when you stop speaking. To turn off
            Voice Mode, click the Setting icon in the top right corner.
          </AlertDescription>
        </Alert>
      )}
      {!state.voiceMode && !state.instructions && (
        <RecommendedTasks runTask={runTaskWithNewInstructions} />
      )}
      {debugMode && <ActionExecutor />}
      <TaskStatus />
      <TaskHistory />
    </>
  );
};

export default TaskUI;
