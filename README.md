# OROT HR v1.0

> **OROT HR — 오롯한 인사체계의 시작**  
> 개인용 인사체계 구축 가이드 · 실행 체크리스트 · 작업 기록 관리 도구

이 저장소는 **정적 웹앱, 안드로이드 APK 자동 빌드용 프로젝트, 선택형 기기 동기화 서버**를 포함합니다. GitHub에 올린 후 GitHub Pages 웹 배포와 GitHub Actions APK 빌드를 각각 실행할 수 있습니다.

## 1. 구현 범위

- 대시보드, 4단계·32개 기본 업무, 상세 실무 가이드와 분류별 체크리스트
- 업무·분류·체크항목의 추가·수정·복제(업무)·삭제·정렬·휴지통 복원
- 업무 상태 5종 및 수동 완료 처리, 체크·해제, 해당 없음 사유
- 보유·확보 상태, 담당자, 위치, 기준일, 확인 결과, 후속 조치, URL 저장
- 검색 및 상태별 필터, 단계·업무 진행률, 업무별 목표일, 중요 표시
- 브라우저/앱 내부 로컬 저장(재접속 유지), JSON 백업·복원·초기화
- 선택 연결 시 Cloudflare Workers+D1 서버를 이용한 PC ↔ 태블릿 동기화 및 1회성 페어링코드
- 반응형 UI, PWA 오프라인 캐시, Android Capacitor 빌드, 제공 아이콘 반영

**제한:** 웹과 앱의 기록은 기본적으로 *각 기기에 별도로* 저장됩니다. 동일 데이터를 쓰려면 별도 동기화 서버를 먼저 개설해야 합니다. GitHub는 DB가 아닙니다. APK 바이너리는 ZIP에 들어 있지 않으며 Actions에서 빌드됩니다. 실서버 배포·실기기 APK 설치 검증은 별도로 진행해야 합니다. GitHub 공개 저장소를 선택하면 `docs` 안의 참고 보고서도 공개됩니다. 공개 전 자료를 확인하거나 해당 문서를 업로드 대상에서 제외하세요.

## 2. 가장 빠른 시작 — GitHub에 올리기

1. GitHub에서 빈 저장소(`OROT-HR`)를 생성합니다.
2. 이 ZIP 압축을 푼 **최상위 파일과 폴더 전체를 저장소 최상위에** 업로드합니다. `.github/workflows` 폴더가 반드시 포함되어야 합니다.
3. Settings → Pages → Build and deployment → **Source: GitHub Actions**로 설정합니다.
4. Actions에서 **Publish OROT HR Web** 작업이 완료되면 Pages 주소로 웹앱을 이용합니다.
5. Actions → **Build OROT HR Android APK** → Run workflow를 눌러 빌드합니다. 완료 후 해당 실행 내 **Artifacts → OROT-HR-debug-APK**를 내려받아 압축을 풀고 `app-debug.apk`를 설치합니다.

PC 로컬 미리보기 (Node.js 필요):

```bash
npm run dev
# http://localhost:4173
```

저장 데이터는 **같은 브라우저 프로필·같은 웹 주소(Origin)** 또는 같은 앱의 데이터 영역에 유지됩니다. 접속 주소를 바꾸면 기존 기록이 자동으로 옮겨지지 않습니다.

단순히 `app/index.html`을 파일 탐색기에서 더블 클릭하면 ES module 보안제약으로 로드되지 않을 수 있습니다. 반드시 HTTP 서버 또는 배포 주소로 여세요.

## 3. PC·갤럭시탭에서 같은 데이터 사용하기 (선택)

GitHub Pages만으로는 기기 간 동기화가 되지 않습니다. 본 ZIP의 `worker` 코드로 개인용 Cloudflare Worker/D1을 **한 번 별도 배포**해야 합니다.

1. Cloudflare 계정을 만들고, PC에 Node.js를 설치합니다.
2. 터미널에서 다음을 실행합니다.

```bash
cd worker
npx wrangler login
npx wrangler d1 create orot-hr-db
```

3. 출력된 `database_id`를 복사하여 `worker/wrangler.template.jsonc`의 `PASTE_YOUR_D1_DATABASE_ID`에 넣고, 파일 이름을 **`wrangler.jsonc`**로 복사합니다. (`wrangler.jsonc`는 .gitignore 처리되어 GitHub에 공개되지 않습니다.)
4. 같은 폴더에서 다음을 실행합니다.

```bash
npx wrangler d1 migrations apply orot-hr-db --remote
npx wrangler secret put SETUP_KEY
npx wrangler deploy
```

5. `SETUP_KEY`에는 추측이 어려운 **16자 이상 비밀문구**를 직접 입력합니다. 이 키는 소스코드나 GitHub에 올리지 마세요.
6. 배포로 나온 `https://...workers.dev` 주소를 복사합니다.
7. **PC 웹앱 → 설정 → 새 동기화 작업공간 만들기**에서 서버 주소, 기기 이름, 위 `SETUP_KEY`를 입력합니다. 현재 PC 기록이 서버의 최초 데이터로 저장됩니다.
8. PC에서 **설정 → 다른 기기 연결코드**를 누르고 12자리 코드를 발급받습니다. 코드는 10분간 한 번만 사용할 수 있습니다.
9. **태블릿 앱 → 설정 → 다른 기기의 연결코드 입력**에서 같은 서버 URL, 12자리 코드, 기기 이름을 입력하면 PC 기록을 받아옵니다. **이 과정은 태블릿에 이미 있던 작업기록을 교체하므로, 먼저 백업**하세요.
10. 두 기기는 변경 시 서버 전송, 재접속/포커스 복귀·30초 주기 확인을 수행합니다. 동시에 수정하면 충돌 알림을 띄워 어떤 기록을 채택할지 선택합니다.

참고: 이 서버는 최초 작업공간 1개만 생성합니다. 직원 개인정보나 민감한 인사자료를 기록할 경우 Cloudflare 계정·백업·기기 접근에 대한 별도 보안 검토가 필요합니다. 기기에 저장되는 액세스 토큰은 백업 파일과 GitHub에 포함되지 않습니다. 서버의 변경 이력 복구·종단간 암호화·공동편집 기능은 구현되어 있지 않습니다.

## 4. APK 안내: 테스트용과 정식 업데이트용이 다릅니다

- **테스트용 APK:** Push 또는 Actions 수동 실행 시 자동 생성됩니다. GitHub Actions의 `Artifacts`에서 받습니다. 안드로이드 테스트 설치에 사용할 수 있습니다.
- **정식 서명 APK:** 같은 앱에 업데이트 설치하려면 동일한 Android 서명키를 계속 사용해야 합니다. GitHub Secrets에 서명정보를 추가한 후 `v1.0.0` 등 `v*` 태그를 push하면 정식 서명 APK가 GitHub Releases에 생성되도록 준비되어 있습니다.
- **중요:** 매 실행의 debug 서명키는 달라질 수 있으므로 debug APK 간 업데이트 설치가 거부될 수 있습니다. 정식 서명 APK로 전환하기 전 데이터를 JSON으로 백업하고, 필요 시 기존 debug 앱을 제거하세요. 앱 제거는 내부 데이터를 삭제합니다.

### 정식 서명키 설정 (한 번만)

PC에 JDK가 설치되어 있다면 터미널에서:

```bash
keytool -genkeypair -v -keystore orot-release.jks -alias orot -keyalg RSA -keysize 3072 -validity 10000
```

다음 값들을 **GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret**에 설정합니다.

| Secret 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `orot-release.jks` 파일을 Base64로 인코딩한 전체 문자열 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 비밀번호 |
| `ANDROID_KEY_ALIAS` | 예: `orot` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |

Windows PowerShell에서 Base64 복사:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("orot-release.jks")) | Set-Clipboard
```

그다음:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Actions 실행 성공 후 **Releases → `OROT-HR-release-signed.apk`**를 받으면 됩니다. 비밀번호와 원본 keystore는 별도 안전한 곳에 백업하세요. 분실 시 이전 설치 앱을 같은 앱으로 업데이트하기 어렵습니다.

## 5. 데이터 초기화·백업 정책

- 체크·상태 등은 즉시 로컬 저장됩니다. 앱을 닫았다 열어도 같은 앱/브라우저 저장영역에서는 유지됩니다.
- **JSON 백업:** 설정 → 백업 파일 저장. 파일에는 설정한 업무구조와 개인 기록이 들어갑니다. 기기 인증 비밀키는 포함되지 않습니다.
- **복원:** 현재 작업공간 전체를 백업 내용으로 교체합니다.
- **진행 기록 초기화:** 상태, 체크 여부, 확인 내용 등을 비우되 수정한 가이드·목록은 유지합니다.
- **전체 초기화:** 기본 4단계 32개 업무로 다시 생성합니다.
- 앱 데이터 삭제·브라우저 저장소 정리·APK 제거 시 로컬 데이터가 사라질 수 있습니다. 정기 백업을 권장합니다.

**안드로이드 주의:** 기기·WebView 버전에 따라 JSON 파일 다운로드·파일선택 동작에 차이가 있을 수 있습니다. APK에서 백업/복원과 외부링크 동작은 실제 갤럭시탭에서 검증해야 합니다.

## 6. 기술 구조

```text
app/                   GitHub Pages/PWA 웹 소스 (의존성 없이 동작)
worker/                선택형 Cloudflare D1 동기화 서버
android-assets/        제공받은 OROT HR 아이콘을 적용한 Android 리소스
scripts/               정적 웹 빌드·로컬 실행·Android 아이콘 복사
.github/workflows/     Pages 배포 + Android APK 빌드 / Releases
capacitor.config.json  Android 패키지 com.orot.hr
package.json           Capacitor 7.6.9 빌드 의존성
```

보고서 원본은 `docs/OROT_HR_제품서비스_상세보고서_v1.0.docx`에 함께 넣었습니다.

**기술 검증 범위:** 파일 구조·자바스크립트 문법·기본 데이터 생성·정적 웹 빌드 검증은 가능하지만, 이 환경에서는 GitHub Actions·Cloudflare 원격 서버·실제 Android 기기의 APK 설치까지 직접 실행할 수 없습니다. 배포 시 해당 서비스의 빌드 로그와 실기기 확인이 필요합니다.
