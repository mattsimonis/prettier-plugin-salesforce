public class DoWhileCommentGapJoin {
  public void run(Boolean flag) {
    do {
      work();
    } while /* probe */ (flag) // keep tail
    ;
  }
}
