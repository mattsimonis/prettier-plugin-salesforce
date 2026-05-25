public class ControlFlowJoinBoundary {
  public void run(Boolean flag) {
    if (flag) {
      work();
    }
    elseLog();
    try {
      work();
    }
    catchAll();
    do {
      work();
    }
    whileCount++;
  }
}
