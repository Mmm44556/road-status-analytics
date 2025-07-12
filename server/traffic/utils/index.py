import os
from datetime import datetime, timedelta

def is_cache_valid(cache_file, CACHE_EXPIRE_SECONDS):
        if not os.path.exists(cache_file):
            return False
        mtime = datetime.fromtimestamp(os.path.getmtime(cache_file))
        return datetime.now() - mtime < timedelta(seconds=CACHE_EXPIRE_SECONDS)