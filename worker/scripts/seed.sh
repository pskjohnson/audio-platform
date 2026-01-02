#!/bin/bash
# worker/scripts/seed.sh

set -e  # Exit on error

# Store original directory where command was run
ORIGINAL_PWD="$(pwd)"

# Parse command line arguments
AUDIO_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      AUDIO_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-f|--file <audio-file>]"
      echo "  -f, --file    Use specified audio file (WAV, MP3, etc.) instead of default seeding"
      echo "                File path is relative to: $ORIGINAL_PWD"
      echo ""
      echo "Default behavior (no -f flag):"
      echo "  - Seeds TWO transcriptions:"
      echo "    1. Real speech audio (gettysburg10.wav)"
      echo "    2. Empty/silent audio (dummy.mp3)"
      echo ""
      echo "Examples:"
      echo "  $0                            # Seed real speech + empty audio"
      echo "  $0 -f ./test.wav              # Use file in current directory"
      echo "  $0 -f ../audio/sample.mp3     # Use file relative to current directory"
      exit 0
      ;;
    --)
      shift
      # npm passes arguments after '--', continue parsing
      while [[ $# -gt 0 ]]; do
        case $1 in
          -f|--file)
            AUDIO_FILE="$2"
            shift 2
            ;;
          *)
            shift
            ;;
        esac
      done
      break
      ;;
    *)
      shift
      ;;
  esac
done

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(dirname "$SCRIPT_DIR")"

# Change to worker directory for env and docker compose
cd "$WORKER_DIR"

echo "Command run from: $ORIGINAL_PWD"
echo "Running script from: $(pwd)"

# Load environment
if [ -f .env ]; then
  source .env
else
  echo "Error: .env not found in $(pwd)" >&2
  exit 1
fi

# Helper function to seed a single transcription
seed_transcription() {
  local AUDIO_ID="$1"
  local TRANSCRIPTION_ID="$2"
  local UPLOAD_FILE="$3"
  local S3_KEY="$4"
  local CONTENT_TYPE="$5"
  local FILENAME="$6"
  
  echo ""
  echo "=== Seeding Transcription ==="
  echo "Audio ID: $AUDIO_ID"
  echo "Transcription ID: $TRANSCRIPTION_ID"
  echo "S3 Key: $S3_KEY"
  echo "Content Type: $CONTENT_TYPE"
  echo "Original Filename: $FILENAME"

  # Upload to S3
  echo ""
  echo "1. Uploading to S3..."
  aws --endpoint-url=$LOCALSTACK_ENDPOINT s3 cp "$UPLOAD_FILE" "s3://$AUDIO_BUCKET_NAME/$S3_KEY" \
    --content-type "$CONTENT_TYPE"
  echo "✅ Uploaded to S3"

  # Escape single quotes in filename for SQL
  ESCAPED_FILENAME=$(echo "$FILENAME" | sed "s/'/''/g")

  # Insert into database using Docker
  echo ""
  echo "2. Inserting into database..."
  docker compose exec -T db psql -U test_user -d jobs_db <<EOF
INSERT INTO audios (id, original_s3_key, original_filename, created_at) 
VALUES ('$AUDIO_ID', '$S3_KEY', '$ESCAPED_FILENAME', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO transcriptions (
  id, audio_id, status,
  attempt_count, created_at, updated_at
) VALUES (
  '$TRANSCRIPTION_ID', '$AUDIO_ID', 'queued', 0, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;
EOF

  echo "✅ Inserted into database"

  # Send to SQS
  echo ""
  echo "3. Sending to SQS..."
  aws --endpoint-url=$LOCALSTACK_ENDPOINT sqs send-message \
    --queue-url $TRANSCRIBE_QUEUE_URL \
    --message-body "{\"transcription_id\": \"$TRANSCRIPTION_ID\"}"
  echo "✅ Sent to SQS"
  
  echo ""
  echo "🎉 Transcription seeded!"
  echo "  Transcription ID: $TRANSCRIPTION_ID"
  echo "  Audio ID: $AUDIO_ID"
  echo "  S3: s3://$AUDIO_BUCKET_NAME/$S3_KEY"
  echo "  Filename: $FILENAME"
}

# Generate lowercase UUIDs function
generate_lowercase_uuid() {
  # Try uuidgen (convert to lowercase)
  if command -v uuidgen &> /dev/null; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  # Try python
  elif command -v python3 &> /dev/null; then
    python3 -c "import uuid; print(str(uuid.uuid4()).lower())"
  # Fallback
  else
    echo "$(date +%s)-$(head -c 16 /dev/urandom | od -An -t x4 | tr -d ' ' | tr '[:upper:]' '[:lower:]')"
  fi
}

# If -f flag is provided, use that file
if [[ -n "$AUDIO_FILE" ]]; then
  # ... existing -f flag handling code (keep as is) ...
  # Resolve audio file path relative to original directory
  if [[ "$AUDIO_FILE" == /* ]]; then
    # Already an absolute path
    RESOLVED_FILE="$AUDIO_FILE"
  else
    # Relative path - resolve from original directory
    RESOLVED_FILE="$ORIGINAL_PWD/$AUDIO_FILE"
  fi
  
  # Check if file exists
  if [[ ! -f "$RESOLVED_FILE" ]]; then
    echo "Error: Audio file not found!" >&2
    echo "  Tried: $RESOLVED_FILE" >&2
    echo "  Original directory: $ORIGINAL_PWD" >&2
    echo "  Audio file argument: $AUDIO_FILE" >&2
    exit 1
  fi
  
  # Get file info
  FILENAME=$(basename "$RESOLVED_FILE")
  EXT="${FILENAME##*.}"
  # Convert extension to lowercase (compatible with older bash)
  EXT_LC=$(echo "$EXT" | tr '[:upper:]' '[:lower:]')
  FILESIZE=$(stat -f%z "$RESOLVED_FILE" 2>/dev/null || stat -c%s "$RESOLVED_FILE" 2>/dev/null || echo "unknown")
  
  echo "Using audio file: $RESOLVED_FILE"
  echo "  Filename: $FILENAME"
  echo "  Extension: .$EXT"
  echo "  Size: $FILESIZE bytes"
  
  # Determine S3 key and content type
  S3_KEY="audios/${AUDIO_ID}/original.${EXT_LC}"
  
  case "$EXT_LC" in
    wav)
      CONTENT_TYPE="audio/wav"
      ;;
    mp3)
      CONTENT_TYPE="audio/mpeg"
      ;;
    m4a)
      CONTENT_TYPE="audio/mp4"
      ;;
    mp4)
      CONTENT_TYPE="video/mp4"  # Could be video with audio
      ;;
    flac)
      CONTENT_TYPE="audio/flac"
      ;;
    ogg)
      CONTENT_TYPE="audio/ogg"
      ;;
    aac)
      CONTENT_TYPE="audio/aac"
      ;;
    *)
      CONTENT_TYPE="audio/$EXT_LC"
      echo "Warning: Unknown audio extension .$EXT, using generic content type" >&2
      ;;
  esac
  
  UPLOAD_FILE="$RESOLVED_FILE"
  
  # Generate IDs
  AUDIO_ID=$(generate_lowercase_uuid)
  TRANSCRIPTION_ID=$(generate_lowercase_uuid)
  
  # Seed single transcription
  seed_transcription "$AUDIO_ID" "$TRANSCRIPTION_ID" "$UPLOAD_FILE" "$S3_KEY" "$CONTENT_TYPE" "$FILENAME"
  
  echo ""
  echo "To monitor:"
  echo "  docker compose logs -f worker"
  echo "  psql -h localhost -U test_user -d jobs_db -c \"SELECT * FROM transcriptions WHERE id = '$TRANSCRIPTION_ID';\""

else
  # DEFAULT BEHAVIOR: Seed both real speech and empty audio
  echo "No -f flag provided. Seeding TWO transcriptions:"
  echo "  1. Real speech audio (gettysburg10.wav)"
  echo "  2. Empty/silent audio (dummy.mp3)"
  echo ""
  
  # Create temporary directory
  mkdir -p ./tmp
  
  # 1. REAL SPEECH AUDIO (Gettysburg Address)
  echo "=== SEEDING REAL SPEECH AUDIO ==="
  REAL_AUDIO_ID=$(generate_lowercase_uuid)
  REAL_TRANSCRIPTION_ID=$(generate_lowercase_uuid)
  REAL_FILENAME="gettysburg10.wav"
  REAL_S3_KEY="audios/${REAL_AUDIO_ID}/original.wav"
  
  # Download Gettysburg audio if not already cached
  CACHED_AUDIO="./tmp/gettysburg10.wav"
  if [[ ! -f "$CACHED_AUDIO" ]]; then
    echo "Downloading Gettysburg Address audio..."
    curl -L -o "$CACHED_AUDIO" "https://courses.cs.duke.edu/cps001/spring06/class/06_Sound/sounds/gettysburg10.wav" 2>/dev/null || {
      echo "Error: Failed to download Gettysburg audio" >&2
      exit 1
    }
  fi
  
  seed_transcription "$REAL_AUDIO_ID" "$REAL_TRANSCRIPTION_ID" "$CACHED_AUDIO" "$REAL_S3_KEY" "audio/wav" "$REAL_FILENAME"
  
  # 2. EMPTY/SILENT AUDIO
  echo ""
  echo "=== SEEDING EMPTY AUDIO ==="
  EMPTY_AUDIO_ID=$(generate_lowercase_uuid)
  EMPTY_TRANSCRIPTION_ID=$(generate_lowercase_uuid)
  EMPTY_FILENAME="dummy.mp3"
  EMPTY_S3_KEY="audios/${EMPTY_AUDIO_ID}/original.mp3"
  
  # Create 1-second silent MP3
  echo "Creating silent MP3..."
  DUMMY_FILE="./tmp/dummy-${EMPTY_AUDIO_ID}.mp3"
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame "$DUMMY_FILE" -y 2>/dev/null || {
    echo "Error: Failed to create dummy audio" >&2
    exit 1
  }
  
  seed_transcription "$EMPTY_AUDIO_ID" "$EMPTY_TRANSCRIPTION_ID" "$DUMMY_FILE" "$EMPTY_S3_KEY" "audio/mpeg" "$EMPTY_FILENAME"
  
  # Clean up dummy file
  rm -f "$DUMMY_FILE"
  
  echo ""
  echo "========================================="
  echo "🎉 Successfully seeded 2 transcriptions!"
  echo ""
  echo "REAL SPEECH:"
  echo "  Transcription ID: $REAL_TRANSCRIPTION_ID"
  echo "  Audio ID: $REAL_AUDIO_ID"
  echo "  Filename: $REAL_FILENAME"
  echo "  Expected: Should transcribe successfully"
  echo ""
  echo "EMPTY AUDIO:"
  echo "  Transcription ID: $EMPTY_TRANSCRIPTION_ID"
  echo "  Audio ID: $EMPTY_AUDIO_ID"
  echo "  Filename: $EMPTY_FILENAME"
  echo "  Expected: Should fail with 'no speech detected'"
  echo ""
  echo "To monitor both:"
  echo "  docker compose logs -f worker"
  echo "  psql -h localhost -U test_user -d jobs_db -c \"SELECT id, audio_id, status, attempt_count FROM transcriptions WHERE id IN ('$REAL_TRANSCRIPTION_ID', '$EMPTY_TRANSCRIPTION_ID');\""
fi