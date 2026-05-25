public class DeclarationMixedBodies {
  public interface Worker {
    void run();
    Integer size();

    class NestedInInterface {
      public void ping() {
        System.debug('x');
      }
    }
  }

  public enum Mode {
    Fast,
    Slow,
    Turbo;

    public Integer weight() {
      return 1;
    }
  }
}
