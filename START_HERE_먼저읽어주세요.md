# OROT HR을 시작하는 방법

**한 번 내려받은 ZIP에 웹 + 안드로이드 + 동기화 서버 코드가 모두 포함**되어 있습니다.

## GitHub에 올린 다음

1. ZIP 압축을 해제합니다.
2. 새 GitHub 저장소를 만들고, 폴더 안의 파일을 **모두** 업로드합니다. `.github` 폴더도 포함하세요.
3. GitHub 저장소의 **Settings → Pages → Source: GitHub Actions**를 설정합니다.
4. **Actions → Publish OROT HR Web**이 성공하면 웹 주소가 발급됩니다.
5. **Actions → Build OROT HR Android APK → Run workflow**를 눌러 빌드를 실행합니다.
6. 빌드가 끝나면 실행 결과의 **Artifacts → OROT-HR-debug-APK** 파일을 받습니다. ZIP 안의 `app-debug.apk`가 안드로이드 설치 파일입니다.

**처음에는 웹/안드로이드 앱 각각의 기기 내부에 따로 저장**됩니다. 데이터가 날아가는 것을 막으려면 설정 → 백업을 주기적으로 수행하세요. 실제로 두 기기가 같은 데이터를 사용하려면 `README.md`의 **3. PC·갤럭시탭에서 같은 데이터 사용하기**를 따라 동기화 서버를 연결해야 합니다.

**정식 업데이트형 APK**는 고정 서명키와 GitHub Secrets 설정이 필요합니다. 최초 테스트 APK와 달리 정식 서명 APK는 GitHub Releases에서 배포하도록 구성했습니다. 자세한 단계와 주의사항은 `README.md`를 참고하세요.

참고: 이 ZIP은 빌드할 수 있는 프로젝트이지, 이미 컴파일된 APK가 들어 있는 패키지는 아닙니다.
