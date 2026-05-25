public class MultiLineBlockCommentElseBoundary {
  public void run(Boolean flag) {
    if (flag) {
      work();
    }
    /* annotate
     * keep this note
     */
    else {
      other();
    }
  }
}
